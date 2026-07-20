import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { registerUser, loginUser } from "../services/auth.service";
import { rotateRefreshToken, revokeRefreshToken } from "../services/token.service";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

const credentialsSchema = z.object({
  email: z.string().email(),
  // Length only here — don't force composition rules (uppercase/symbol),
  // they push users toward predictable patterns and don't stop bots.
  password: z.string().min(8).max(72), // 72 = bcrypt's input limit
});

function toPublicUser(user: { id: string; email: string; rating: number; plan: string; createdAt: Date }) {
  return { id: user.id, email: user.email, rating: user.rating, plan: user.plan, createdAt: user.createdAt };
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const { user, tokens } = await registerUser(email, password);
    res.status(201).json({ user: toPublicUser(user), ...tokens });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const { user, tokens } = await loginUser(email, password);
    res.status(200).json({ user: toPublicUser(user), ...tokens });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const tokens = await rotateRefreshToken(refreshToken);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Proves the `authenticate` middleware + access token flow works end to end.
export async function me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
}
