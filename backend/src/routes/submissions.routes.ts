import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimiter";
import { idempotency } from "../middleware/idempotency";
import {
  createSubmission,
  getSubmissionById,
  getUserSubmissions,
} from "../controllers/submissions.controller";

export const submissionsRouter = Router();

// Protect all submission routes with authentication
submissionsRouter.use(authenticate);

// Rate limiter configuration for submissions endpoint
const rateLimiterRefillRate = parseInt(process.env.SUBMISSION_RATE_LIMIT_REFILL ?? "10", 10);
const rateLimiterCapacity = parseInt(process.env.SUBMISSION_RATE_LIMIT_CAPACITY ?? "10", 10);
const submissionRateLimiter = rateLimiter({
  refillRate: rateLimiterRefillRate,
  capacity: rateLimiterCapacity,
});

// Idempotency middleware
const submissionIdempotency = idempotency();

/**
 * @route POST /submissions
 * @desc Create a new code submission (judge job)
 * @access Private
 */
submissionsRouter.post(
  "/",
  submissionRateLimiter,
  submissionIdempotency,
  createSubmission
);

/**
 * @route GET /submissions/:id
 * @desc Get submission by ID (if belongs to user or admin)
 * @access Private
 */
submissionsRouter.get("/:id", getSubmissionById);

/**
 * @route GET /submissions
 * @desc Get all submissions for the authenticated user
 * @access Private
 */
submissionsRouter.get("/", getUserSubmissions);