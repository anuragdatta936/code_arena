import { prisma } from "../config/prisma";
import { redis } from "../config/redis";

// Submission status values (match Prisma enum later)
export const SubmissionStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  ACCEPTED: "ACCEPTED",
  WRONG_ANSWER: "WRONG_ANSWER",
  TIME_LIMIT_EXCEEDED: "TIME_LIMIT_EXCEEDED",
  MEMORY_LIMIT_EXCEEDED: "MEMORY_LIMIT_EXCEEDED",
  RUNTIME_ERROR: "RUNTIME_ERROR",
} as const;

export type SubmissionStatus = typeof SubmissionStatus[keyof typeof SubmissionStatus];

// Job payload sent to Redis queue
interface SubmissionJob {
  submissionId: string;
  userId: string;
  problemId: string;
  language: string;
  code: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

/**
 * Create a new submission record and enqueue a job for the worker.
 * @returns The created submission object (with id, status=PENDING, etc.)
 */
export async function createSubmission(
  userId: string,
  problemId: string,
  language: string,
  code: string
) {
  // Insert submission row
  const submission = await prisma.submission.create({
    data: {
      userId,
      problemId,
      language,
      code,
      status: SubmissionStatus.PENDING,
    },
  });

  // Fetch problem to get limits
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
  });
  if (!problem) {
    throw new Error(`Problem not found: ${problemId}`);
  }

  // Enqueue job
  const job: SubmissionJob = {
    submissionId: submission.id,
    userId,
    problemId,
    language,
    code,
    timeLimitMs: problem.timeLimitMs,
    memoryLimitMb: problem.memoryLimitMb,
  };
  // Using LPUSH for producer (BRPOPLPUSH for consumer in worker)
  await redis.lpush("submission_queue", JSON.stringify(job));

  return submission;
}

/**
 * Get a submission by ID, ensuring it belongs to the user (or admin later).
 * @returns Submission object or null if not found/access denied.
 */
export async function getSubmissionById(
  submissionId: string,
  userId: string
) {
  return await prisma.submission.findFirst({
    where: { id: submissionId, userId },
  });
}

/**
 * Get paginated submissions for a user.
 * @returns Array of submission objects (most recent first).
 */
export async function getUserSubmissions(
  userId: string,
  limit: number,
  offset: number
) {
  return await prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}