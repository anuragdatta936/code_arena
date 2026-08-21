import { Router } from "express";
import {
  getProblems,
  getProblemById,
  getProblemTestCases,
} from "../controllers/problems.controller";

export const problemsRouter = Router();

// Problems routes are public (no authentication required)
// Submission routes remain protected

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