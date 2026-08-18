import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import { executeCode, ExecutionResult } from "../utils/dockerExecutor";
import { SubmissionStatus } from "../services/submissions.service";

// How long to wait between polling if queue is empty (ms)
const POLL_INTERVAL_MS = 1000;

// Maximum number of concurrent jobs a worker should process
// Set to 1 for simplicity; can be increased for parallel processing within a worker
const MAX_CONCURRENT_JOBS = 1;

// Queue names
const SUBMISSION_QUEUE = "submission_queue";
const SUBMISSION_PROCESSING_QUEUE = "submission_queue_processing";

// How long to wait before considering a job in processing queue as stale (ms)
// Jobs older than this will be recovered back to main queue
const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Recover stale jobs from the processing queue back to the main queue.
 * This should be called periodically or on worker startup to handle
 * cases where a worker crashed while processing a job.
 */
async function recoverStaleJobs(): Promise<void> {
  try {
    // Get all jobs from the processing queue with their timestamps
    // We'll use BRPOPLPUSH in a loop to move items to a temporary list,
    // check their age, and either put them back in processing or main queue

    const processingLength = await redis.llen(SUBMISSION_PROCESSING_QUEUE);
    if (processingLength === 0) {
      return;
    }

    console.log(`[Worker] Checking for stale jobs in ${SUBMISSION_PROCESSING_QUEUE} (length: ${processingLength})`);

    // Process each job in the processing queue
    for (let i = 0; i < processingLength; i++) {
      // Use RPOP to get from the right (oldest) end of the list
      const result = await redis.rpop(SUBMISSION_PROCESSING_QUEUE);
      if (!result) continue;

      const [, jobString] = result; // RPOP returns [key, value] when using with key argument
      const jobPayload = JSON.parse(jobString);

      // For simplicity in this implementation, we'll recover all jobs from processing queue
      // In a more sophisticated implementation, we'd check timestamps in the job payload
      // For now, we assume any job left in processing queue when worker starts is stale

      // Push back to main queue for reprocessing
      await redis.lpush(SUBMISSION_QUEUE, jobString);
      console.log(`[Worker] Recovered stale job ${jobPayload.submissionId} to main queue`);
    }
  } catch (error) {
    console.error("[Worker] Error recovering stale jobs:", error);
  }
}

/**
 * Process a single submission job.
 * @param jobPayload - Parsed job object from Redis
 */
async function processJob(jobPayload: any): Promise<void> {
  const {
    submissionId,
    userId,
    problemId,
    language,
    code,
    timeLimitMs,
    memoryLimitMb,
  } = jobPayload;

  console.log(`[Worker] Processing submission ${submissionId}`);

  // Update status to PROCESSING
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: SubmissionStatus.PROCESSING },
  });

  // Fetch test cases for the problem
  const testCases = await prisma.testcase.findMany({
    where: { problemId },
  });

  // If there are no test cases, we cannot judge the submission
  if (testCases.length === 0) {
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.RUNTIME_ERROR, // Treat as error since no test cases
        // Note: We don't have a field to store error message in Submission model yet
      },
    });
    console.log(`[Worker] No test cases found for problem ${problemId}`);
    return;
  }

  let maxRuntime = 0;
  let maxMemory = 0;
  let finalVerdict: SubmissionStatus = SubmissionStatus.ACCEPTED;
  let finalRuntime = 0;
  let finalMemory = 0;

  // Process each test case sequentially
  for (const testCase of testCases) {
    console.log(`[Worker] Running test case ${testCase.id} for submission ${submissionId}`);

    let result: ExecutionResult;
    try {
      result = await executeCode(
        language,
        code,
        testCase.input,
        timeLimitMs,
        memoryLimitMb
      );
    } catch (error) {
      console.error(`[Worker] Unexpected error in executeCode for test case ${testCase.id}:`, error);
      result = {
        verdict: SubmissionStatus.RUNTIME_ERROR,
        runtimeMs: 0,
        memoryKb: 0,
        stdout: "",
        stderr: String(error),
      };
    }

    // Update max runtime and memory
    if (result.runtimeMs > maxRuntime) maxRuntime = result.runtimeMs;
    if (result.memoryKb > maxMemory) maxMemory = result.memoryKb;

    // Check if the execution exceeded limits or had runtime error
    if (result.verdict === SubmissionStatus.TIME_LIMIT_EXCEEDED) {
      finalVerdict = SubmissionStatus.TIME_LIMIT_EXCEEDED;
      finalRuntime = result.runtimeMs;
      finalMemory = result.memoryKb;
      break;
    } else if (result.verdict === SubmissionStatus.MEMORY_LIMIT_EXCEEDED) {
      finalVerdict = SubmissionStatus.MEMORY_LIMIT_EXCEEDED;
      finalRuntime = result.runtimeMs;
      finalMemory = result.memoryKb;
      break;
    } else if (result.verdict === SubmissionStatus.RUNTIME_ERROR) {
      finalVerdict = SubmissionStatus.RUNTIME_ERROR;
      finalRuntime = result.runtimeMs;
      finalMemory = result.memoryKb;
      break;
    }

    // If execution was successful, check the output
    const expectedOutput = testCase.expectedOutput.trim();
    const actualOutput = result.stdout.trim();

    if (actualOutput !== expectedOutput) {
      finalVerdict = SubmissionStatus.WRONG_ANSWER;
      finalRuntime = result.runtimeMs;
      finalMemory = result.memoryKb;
      break;
    }
  }

  // Update submission with final results
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: finalVerdict,
      runtimeMs: finalVerdict === SubmissionStatus.ACCEPTED ? maxRuntime : finalRuntime,
      memoryKb: finalVerdict === SubmissionStatus.ACCEPTED ? maxMemory : finalMemory,
    },
  });

  console.log(`[Worker] Finished submission ${submissionId}: ${finalVerdict}`);
}

/**
 * Main worker loop: pull jobs from Redis queue and process them.
 */
export async function workerMain(): Promise<void> {
  console.log("[Worker] Starting job processor...");

  // Ensure we can connect to Redis
  try {
    await redis.ping();
    console.log("[Worker] Connected to Redis");
  } catch (error) {
    console.error("[Worker] Failed to connect to Redis:", error);
    process.exit(1);
  }

  // Recover any stale jobs from previous worker instance(s) on startup
  await recoverStaleJobs();

  // Process jobs from queue using BRPOPLPUSH for reliability
  while (true) {
    try {
      // BRPOPLPUSH atomically moves job from main queue to processing queue
      // Returns [sourceKey, value] or null if timeout
      const result = await redis.brpoplpush(SUBMISSION_QUEUE, SUBMISSION_PROCESSING_QUEUE, 0);

      if (result) {
        const [, jobString] = result; // BRPOPLPUSH returns [destinationKey, value]
        const jobPayload = JSON.parse(jobString);

        // Process the job
        await processJob(jobPayload);

        // Remove job from processing queue after successful processing
        await redis.lrem(SUBMISSION_PROCESSING_QUEUE, 1, jobString);
      }
    } catch (error) {
      console.error("[Worker] Error in main loop:", error);
      // Wait a bit before retrying to avoid tight error loop
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// If this file is run directly, start the worker
if (require.main === module) {
  workerMain().catch((error) => {
    console.error("[Worker] Fatal error:", error);
    process.exit(1);
  });
}