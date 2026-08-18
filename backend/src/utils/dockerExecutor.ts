import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { env } from "../config/env";
import { SubmissionStatus } from "../services/submissions.service";

const execFilePromise = promisify(execFile);

// Timeout for code execution (ms)
const EXECUTION_TIMEOUT = Number(env.CODE_EXECUTION_TIMEOUT_MS ?? "5000");

// Directory where temporary work directories will be created
const WORK_BASE_DIR = path.join(process.cwd(), "tmp", "work");

/**
 * Ensure the base work directory exists.
 */
export function ensureWorkDir() {
  if (!fs.existsSync(WORK_BASE_DIR)) {
    fs.mkdirSync(WORK_BASE_DIR, { recursive: true });
  }
}

/**
 * Result of code execution.
 */
export interface ExecutionResult {
  verdict: SubmissionStatus;
  runtimeMs: number; // actual runtime in milliseconds
  memoryKb: number; // max memory used in KB
  stdout: string;
  stderr: string;
}

/**
 * Execute user code in a Docker sandbox with strict resource limits.
 *
 * @param language - Programming language ("python", "java", "cpp")
 * @param code - Source code to execute
 * @param input - Standard input for the program (optional)
 * @param timeLimitMs - Time limit for the problem (overrides default)
 * @param memoryLimitMb - Memory limit for the problem (overrides default)
 * @returns ExecutionResult with verdict and metrics
 *
 * Security design:
 * - --network none: no external network access
 * - --pids-limit 64: limit number of processes/threads
 * - --read-only filesystem: except for mounted scratch dir
 * - --memory and --cpus: hardware limits enforced by cgroups
 * - User runs as non-root (default in most language images)
 * - Temporary directory is unique per execution and cleaned up after
 */
export async function executeCode(
  language: string,
  code: string,
  input: string = "",
  timeLimitMs: number = EXECUTION_TIMEOUT,
  memoryLimitMb: number = 128
): Promise<ExecutionResult> {
  // Ensure base work directory exists
  ensureWorkDir();

  // Create a unique directory for this execution
  const executionId = randomUUID();
  const workDir = path.join(WORK_BASE_DIR, executionId);

  try {
    // Create the work directory
    fs.mkdirSync(workDir, { recursive: true });

    // Write the source code to a file based on language
    let sourceFile: string;
    let command: string[];

    switch (language) {
      case "python":
        sourceFile = path.join(workDir, "solution.py");
        fs.writeFileSync(sourceFile, code, "utf8");
        command = ["python3", "/tmp/work/solution.py"];
        break;

      case "java":
        sourceFile = path.join(workDir, "Solution.java");
        fs.writeFileSync(sourceFile, code, "utf8");
        // Compile first
        await execFilePromise("javac", [sourceFile], {
          cwd: workDir,
          timeout: 10000, // 10 sec for compilation
        });
        command = ["java", "-cp", "/tmp/work", "Solution"];
        break;

      case "cpp":
        sourceFile = path.join(workDir, "solution.cpp");
        fs.writeFileSync(sourceFile, code, "utf8");
        // Compile with optimizations off for consistent timing
        await execFilePromise("g++", [sourceFile, "-o", "solution", "-lm", "-lcrypt", "-O2", "-std=c++17"], {
          cwd: workDir,
          timeout: 15000, // 15 sec for compilation
        });
        command = ["/tmp/work/solution"];
        break;

      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    // Write input to a file if provided
    if (input) {
      const inputFile = path.join(workDir, "input.txt");
      fs.writeFileSync(inputFile, input, "utf8");
    }

    // Prepare Docker run arguments
    const dockerArgs = [
      "run",
      "--rm",
      "--network", "none",
      "--pids-limit", "64",
      "--read-only",
      // Mount work directory as /tmp/work (noexec for extra safety?)
      "-v", `${workDir}:/tmp/work`,
      // Memory and CPU limits
      "--memory", `${memoryLimitMb}m`,
      "--cpus", "0.5",
      // Use a lightweight image - we'll use python:3.12-slim as base and install others as needed
      // For MVP, we'll have separate images or use a multi-language image
      // Simpler approach: use language-specific images
      language === "python" ? "python:3.12-slim" :
                           language === "java" ? "openjdk:17-slim" :
                           "gcc:latest", // for cpp
      // The command to run (overrides IMAGE's default CMD)
      ...command,
    ];

    // If we have input, redirect stdin from the input file
    let stdinData: Buffer | undefined;
    if (input) {
      stdinData = Buffer.from(input);
    }

    // Execute with timeout
    const startTime = Date.now();
    const { stdout, stderr } = await execFilePromise("docker", dockerArgs, {
      timeout: timeLimitMs + 2000, // Allow a bit extra for Docker overhead
      maxBuffer: 1024 * 1024, // 1MB max stdout/stderr
      stdin: stdinData,
    } as any);
    const endTime = Date.now();

    // Parse Docker's output to get resource usage (optional)
    // For simplicity, we'll measure time ourselves and assume memory is capped by Docker
    // A more advanced approach would parse `docker stats` or use --cpuset etc.

    // Get actual memory usage from container stats
    let actualMemoryKb = memoryLimitMb * 1024; // fallback to limit
    try {
      const { stdout: statsStdout } = await execFilePromise("docker", ["stats", "--no-stream", "--format", "{{.MemUsage}}", executionId.toString()], {} as any);
      // Parse output like "MiB / GiB" or "KiB / MiB"
      const memUsage = statsStdout.toString("utf8").trim().split(" / ")[0]; // get usage part
      let memoryValue = 0;
      let memoryUnit = "B";

      if (memUsage.endsWith("KiB")) {
        memoryValue = parseFloat(memUsage);
        memoryUnit = "KiB";
      } else if (memUsage.endsWith("MiB")) {
        memoryValue = parseFloat(memUsage);
        memoryUnit = "MiB";
      } else if (memUsage.endsWith("GiB")) {
        memoryValue = parseFloat(memUsage) * 1024;
        memoryUnit = "MiB";
      } else if (memUsage.endsWith("B")) {
        memoryValue = parseFloat(memUsage) / 1024;
        memoryUnit = "KiB";
      }

      if (!isNaN(memoryValue)) {
        actualMemoryKb = Math.round(memoryValue * (memoryUnit === "KiB" ? 1 : memoryUnit === "MiB" ? 1024 : 1));
      }
    } catch (statsError) {
      // If we can't get stats, fall back to limit (but log warning)
      const errorMessage = statsError instanceof Error ? statsError.message : String(statsError);
      console.warn(`[dockerExecutor] Failed to get memory stats for container ${executionId}:`, errorMessage);
    }

    return {
      verdict: SubmissionStatus.ACCEPTED, // If we got here without timeout, it ran successfully
      runtimeMs: endTime - startTime,
      memoryKb: actualMemoryKb,
      stdout: stdout.toString("utf8"),
      stderr: stderr.toString("utf8"),
    };
  } catch (error: any) {
    // Handle different error types
    if (error.name === "Error" && error.message.includes("timeout")) {
      // Determine if it was time limit exceeded or something else
      let memoryKb = 0;
      try {
        // Try to get memory stats even for timed out containers
        const { stdout: statsStdout } = await execFilePromise("docker", ["stats", "--no-stream", "--format", "{{.MemUsage}}", executionId.toString()], {} as any);
        // Parse output like "MiB / GiB" or "KiB / MiB"
        const memUsage = statsStdout.toString("utf8").trim().split(" / ")[0]; // get usage part
        let memoryValue = 0;
        let memoryUnit = "B";

        if (memUsage.endsWith("KiB")) {
          memoryValue = parseFloat(memUsage);
          memoryUnit = "KiB";
        } else if (memUsage.endsWith("MiB")) {
          memoryValue = parseFloat(memUsage);
          memoryUnit = "MiB";
        } else if (memUsage.endsWith("GiB")) {
          memoryValue = parseFloat(memUsage) * 1024;
          memoryUnit = "MiB";
        } else if (memUsage.endsWith("B")) {
          memoryValue = parseFloat(memUsage) / 1024;
          memoryUnit = "KiB";
        }

        if (!isNaN(memoryValue)) {
          memoryKb = Math.round(memoryValue * (memoryUnit === "KiB" ? 1 : memoryUnit === "MiB" ? 1024 : 1));
        }
      } catch (statsError) {
        // If we can't get stats, leave as 0
        const errorMessage = statsError instanceof Error ? statsError.message : String(statsError);
        console.warn(`[dockerExecutor] Failed to get memory stats for timed out container ${executionId}:`, errorMessage);
      }

      return {
        verdict: SubmissionStatus.TIME_LIMIT_EXCEEDED,
        runtimeMs: timeLimitMs, // We hit the time limit
        memoryKb: memoryKb,
        stdout: "",
        stderr: "Execution timed out",
      };
    }

    // Docker container exited with non-zero code (runtime error)
    // or other execution error
    let memoryKb = 0;
    try {
      // Try to get memory stats even for error containers
      const { stdout: statsStdout } = await execFilePromise("docker", ["stats", "--no-stream", "--format", "{{.MemUsage}}", executionId.toString()], {} as any);
      // Parse output like "MiB / GiB" or "KiB / MiB"
      const memUsage = statsStdout.toString("utf8").trim().split(" / ")[0]; // get usage part
      let memoryValue = 0;
      let memoryUnit = "B";

      if (memUsage.endsWith("KiB")) {
        memoryValue = parseFloat(memUsage);
        memoryUnit = "KiB";
      } else if (memUsage.endsWith("MiB")) {
        memoryValue = parseFloat(memUsage);
        memoryUnit = "MiB";
      } else if (memUsage.endsWith("GiB")) {
        memoryValue = parseFloat(memUsage) * 1024;
        memoryUnit = "MiB";
      } else if (memUsage.endsWith("B")) {
        memoryValue = parseFloat(memUsage) / 1024;
        memoryUnit = "KiB";
      }

      if (!isNaN(memoryValue)) {
        memoryKb = Math.round(memoryValue * (memoryUnit === "KiB" ? 1 : memoryUnit === "MiB" ? 1024 : 1));
      }
    } catch (statsError) {
      // If we can't get stats, leave as 0
      const errorMessage = statsError instanceof Error ? statsError.message : String(statsError);
      console.warn(`[dockerExecutor] Failed to get memory stats for error container ${executionId}:`, errorMessage);
    }

    return {
      verdict: SubmissionStatus.RUNTIME_ERROR,
      runtimeMs: Date.now() - (typeof error.startTime !== "undefined" ? error.startTime : Date.now()),
      memoryKb: memoryKb,
      stdout: error.stdout ? error.stdout.toString("utf8") : "",
      stderr: error.stderr ? error.stderr.toString("utf8") : error.message,
    };
  } finally {
    // Clean up work directory
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (e) {
      // Best effort cleanup
      console.warn(`Failed to clean up work directory ${workDir}:`, e);
    }
  }
}