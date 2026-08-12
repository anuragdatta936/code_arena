import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  createSubmission,
  getSubmissionById,
  getUserSubmissions,
} from "../controllers/submissions.controller";

export const submissionsRouter = Router();

// Protect all submission routes with authentication
submissionsRouter.use(authenticate);

/**
 * @route POST /submissions
 * @desc Create a new code submission (judge job)
 * @access Private
 */
submissionsRouter.post("/", createSubmission);

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