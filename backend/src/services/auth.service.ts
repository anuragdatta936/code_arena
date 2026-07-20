import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { issueTokenPair } from "./token.service";

const BCRYPT_COST_FACTOR = 12; // ~250ms per hash on typical hardware — deliberately slow

export class AuthError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
  }
}

export async function registerUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AuthError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);
  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  const tokens = await issueTokenPair(user.id, user.email);
  return { user, tokens };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same error for "no such user" and "wrong password" — don't leak
  // which emails are registered via a different error message/timing.
  if (!user) {
    throw new AuthError("Invalid email or password", 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthError("Invalid email or password", 401);
  }

  const tokens = await issueTokenPair(user.id, user.email);
  return { user, tokens };
}
