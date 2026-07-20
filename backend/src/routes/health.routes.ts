import { Router } from "express";
import { prisma } from "../config/prisma";

export const healthRouter = Router();

// Checks the DB connection too — a 200 here means "the app can actually
// serve traffic," not just "the process is running."
healthRouter.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "degraded", reason: "database unreachable" });
  }
});
