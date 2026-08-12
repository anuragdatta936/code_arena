import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createSubmission as createSubmissionService, getSubmissionById as getSubmissionByIdService, getUserSubmissions as getUserSubmissionsService } from "../services/submissions.service";
import { AuthenticatedRequest } from "../middleware/auth";

// Validation schema for creating a submission
const createSubmissionSchema = z.object({
  problemId: z.string(),
  language: z.enum(["python", "java", "cpp"]), // MVP: start with python only, but allow extension
  code: z.string().min(1, "Code cannot be empty"),
});

/**
 * POST /submissions
 * Validate input, create submission record, enqueue job to Redis.
 */
export async function createSubmission(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { problemId, language, code } = createSubmissionSchema.parse(req.body);
    const userId = req.userId!; // guaranteed by authenticate middleware

    const submission = await createSubmissionService(userId, problemId, language, code);
    res.status(201).json({ submissionId: submission.id });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /submissions/:id
 * Fetch submission by ID, ensure it belongs to the user (or admin later).
 */
export async function getSubmissionById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const userId = req.userId!;

    const submission = await getSubmissionByIdService(id, userId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.status(200).json(submission);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /submissions
 * Fetch paginated submissions for the user (simple limit/offset for MVP).
 */
export async function getUserSubmissions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!;
    const { limit, offset } = z
      .object({
        limit: z.string().optional().default("10"),
        offset: z.string().optional().default("0"),
      })
      .parse(req.query);

    const submissions = await getUserSubmissionsService(
      userId,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );
    res.status(200).json(submissions);
  } catch (err) {
    next(err);
  }
}