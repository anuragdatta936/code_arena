import { Request, Response, NextFunction } from "express";
import { AuthError } from "../services/auth.service";

// Centralized error handling: routes/controllers just throw, this is the
// only place that decides status codes and response shape.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AuthError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
