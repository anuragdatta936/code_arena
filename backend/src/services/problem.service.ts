import { prisma } from "../config/prisma";
import { LRUCache } from "../utils/lruCache";

/**
 * LRU cache for problem data to reduce database load for hot problems.
 * We cache the entire problem object (including testcases? maybe not testcases because they can be large).
 * For now, we cache the problem without testcases, and fetch testcases separately if needed.
 * Alternatively, we can cache the problem with testcases but set a reasonable capacity.
 */
const problemCache = new LRUCache<string, ProblemWithTestcases>(100); // Cache up to 100 problems

export interface ProblemWithTestcases {
  id: string;
  title: string;
  difficulty: string;
  tags: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  testcases: {
    id: string;
    input: string;
    expectedOutput: string;
    isSample: boolean;
  }[];
}

/**
 * Get a problem by ID, using LRU cache for hot data.
 * @param problemId - The problem ID
 * @returns The problem with its testcases, or null if not found
 */
export async function getProblemById(problemId: string): Promise<ProblemWithTestcases | null> {
  // Try to get from cache first
  const cached = problemCache.get(problemId);
  if (cached) {
    return cached;
  }

  // If not in cache, fetch from database
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: {
      testcases: true,
    },
  });

  if (!problem) {
    return null;
  }

  // Map to our interface (Prisma returns the same shape, but we'll ensure)
  const problemWithTestcases: ProblemWithTestcases = {
    id: problem.id,
    title: problem.title,
    difficulty: problem.difficulty,
    tags: problem.tags,
    timeLimitMs: problem.timeLimitMs,
    memoryLimitMb: problem.memoryLimitMb,
    testcases: problem.testcases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isSample: tc.isSample,
    })),
  };

  // Store in cache
  problemCache.put(problemId, problemWithTestcases);

  return problemWithTestcases;
}

/**
 * Get multiple problems by IDs, using LRU cache.
 * @param problemIds - Array of problem IDs
 * @returns Array of problems (null for not found)
 */
export async function getProblemsByIds(problemIds: string[]): Promise<(ProblemWithTestcases | null)[]> {
  const results: (ProblemWithTestcases | null)[] = [];
  const uncachedIds: string[] = [];

  // First, check cache for each ID
  for (const id of problemIds) {
    const cached = problemCache.get(id);
    if (cached) {
      results.push(cached);
    } else {
      results.push(null); // placeholder
      uncachedIds.push(id);
    }
  }

  // Fetch uncached problems from database
  if (uncachedIds.length > 0) {
    const problems = await prisma.problem.findMany({
      where: { id: { in: uncachedIds } },
      include: {
        testcases: true,
      },
    });

    // Map and update cache and results
    const problemsMap = new Map<string, ProblemWithTestcases>();
    for (const p of problems) {
      const problemWithTestcases: ProblemWithTestcases = {
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        tags: p.tags,
        timeLimitMs: p.timeLimitMs,
        memoryLimitMb: p.memoryLimitMb,
        testcases: p.testcases.map((tc) => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: tc.isSample,
        })),
      };
      problemsMap.set(p.id, problemWithTestcases);
      problemCache.put(p.id, problemWithTestcases);
    }

    // Update results array
    for (let i = 0; i < problemIds.length; i++) {
      if (results[i] === null) {
        results[i] = problemsMap.get(problemIds[i]) ?? null;
      }
    }
  }

  return results;
}

/**
 * Clear the entire problem cache.
 * Useful when problems are updated in bulk.
 */
export function clearProblemCache(): void {
  problemCache.clear();
}

/**
 * Invalidate a single problem in the cache.
 * @param problemId - The problem ID to invalidate
 */
export function invalidateProblemCache(problemId: string): void {
  problemCache.delete(problemId);
}