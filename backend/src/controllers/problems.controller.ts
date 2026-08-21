import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getProblemById as getProblemByIdService,
  getProblemsByIds as getProblemsByIdsService,
  clearProblemCache,
  invalidateProblemCache,
} from "../services/problem.service";
import { AuthenticatedRequest } from "../middleware/auth";

// Validation schema for getting problems (query parameters)
const getProblemsSchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  tags: z.string().optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
});

// Validation schema for getting a single problem by ID
const getProblemByIdSchema = z.object({
  id: z.string(),
});

/**
 * GET /problems
 * Get paginated list of problems with optional filtering by tags and difficulty
 */
export async function getProblems(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { page, limit, tags, difficulty } = getProblemsSchema.parse(req.query);

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering
    const where: any = {};

    if (tags) {
      // For PostgreSQL array containment, we need to use the @> operator
      // Prisma doesn't have direct support for array contains, so we'll use a raw query approach
      // Alternatively, we can fetch all and filter in memory for MVP, but let's do it properly
      where.tags = {
        has: tags, // This checks if the tags array contains the specified tag
      };
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    // Get problems with pagination
    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.problem.count({ where }),
    ]);

    // Convert to the format expected by frontend
    const problemsData = problems.map((problem) => ({
      id: problem.id,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags,
      // Note: Not including description in list view to keep payload small
    }));

    res.status(200).json({
      data: problemsData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /problems/:id
 * Get a single problem by ID
 */
export async function getProblemById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = getProblemByIdSchema.parse(req.params);

    const problem = await getProblemByIdService(id);

    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    // Return problem without testcases for the problem detail view
    // (testcases are fetched separately via /problems/:id/testcases)
    res.status(200).json({
      id: problem.id,
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description || "", // Will need to add description to Problem model
      tags: problem.tags,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /problems/:id/testcases
 * Get test cases for a specific problem
 */
export async function getProblemTestCases(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = getProblemByIdSchema.parse(req.params);

    // First check if problem exists
    const problem = await getProblemByIdService(id);
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    // Fetch testcases directly from database
    const testcases = await prisma.testcase.findMany({
      where: { problemId: id },
      orderBy: { createdAt: 'asc' },
    });

    const testcasesData = testcases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isSample: tc.isSample,
    }));

    res.status(200).json(testcasesData);
  } catch (err) {
    next(err);
  }
}