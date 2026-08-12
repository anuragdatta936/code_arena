import crypto from "node:crypto";
import ms from "ms";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

function hashToken(token: string): string {
  // Refresh tokens are bearer secrets — store only a hash, same principle
  // as passwords, so a DB read alone never yields a usable token.
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueTokenPair(userId: string, email: string) {
  const accessToken = signAccessToken({ sub: userId, email });
  const refreshToken = signRefreshToken({ sub: userId });

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN as unknown as ms.StringValue)),
    },
  });

  return { accessToken, refreshToken };
}

// Rotation: every refresh call issues a brand-new refresh token and revokes
// the old one. If a stolen refresh token gets used after the legitimate
// user already rotated it, the stolen one is already revoked and fails —
// that's the whole point of rotation over long-lived static refresh tokens.
export async function rotateRefreshToken(oldToken: string) {
  const payload = verifyRefreshToken(oldToken); // throws if invalid/expired
  const oldHash = hashToken(oldToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new Error("Refresh token is invalid or has already been used");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new Error("User no longer exists");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  return issueTokenPair(user.id, user.email);
}

export async function revokeRefreshToken(token: string) {
  const hash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash },
    data: { revoked: true },
  });
}
