import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getProblems,
  getProblemById,
  getProblemTestCases,
} from "../controllers/problems.controller";

export const problemsRouter = Router();

// Protect all problems routes with authentication (optional for public problems)
// For now, we'll require authentication to access problems
problemsRouter.use(authenticate);

/**
 * @route GET /problems
 * @desc Get paginated list of problems with filtering
 * @access Private
 */
problemsRouter.get("/", getProblems);

/**
 * @route GET /problems/:id
 * @desc Get problem by ID
 * @access Private
 */
problemsRouter.get("/:id", getProblemById);

/**
 * @route GET /problems/:id/testcases
 * @desc Get test cases for a problem
 * @access Private
 */
problemsRouter.get("/:id/testcases", getProblemTestCases);