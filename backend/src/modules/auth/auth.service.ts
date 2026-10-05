import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { verifyAgainstDummy, verifyPassword } from '../../lib/password';
import {
  REFRESH_TOKEN_TTL_MS,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/tokens';
import { publicUserSelect, type PublicUser } from '../users/users.service';
import type { LoginInput } from './auth.schema';

interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

async function issueTokens(
  user: PublicUser,
  meta: ClientMeta,
  tx: Prisma.TransactionClient = prisma,
): Promise<AuthResult> {
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken(user.id, jti);
  await tx.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      ip: meta.ip?.slice(0, 64),
      userAgent: meta.userAgent?.slice(0, 255),
    },
  });
  return { user, accessToken: signAccessToken(user), refreshToken };
}

const invalidCredentials = () => new AppError(401, 'Email atau password salah', 'INVALID_CREDENTIALS');

export async function login(input: LoginInput, meta: ClientMeta): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    await verifyAgainstDummy(input.password);
    throw invalidCredentials();
  }
  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw invalidCredentials();
  if (!user.isActive) throw new AppError(403, 'Akun dinonaktifkan', 'ACCOUNT_DISABLED');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: publicUserSelect,
  });
  return issueTokens(updated, meta);
}

/**
 * Refresh token rotation: each refresh token is single-use. Presenting a
 * token that was already rotated means it leaked, so every session of that
 * user is revoked.
 */
export async function refresh(token: string | undefined, meta: ClientMeta): Promise<AuthResult> {
  if (!token) throw AppError.unauthorized('No refresh token', 'REFRESH_INVALID');

  let claims;
  try {
    claims = verifyRefreshToken(token);
  } catch {
    throw AppError.unauthorized('Invalid refresh token', 'REFRESH_INVALID');
  }

  const record = await prisma.refreshToken.findUnique({ where: { id: claims.jti } });
  if (!record || record.tokenHash !== sha256(token) || record.userId !== claims.sub) {
    throw AppError.unauthorized('Invalid refresh token', 'REFRESH_INVALID');
  }

  if (record.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw AppError.unauthorized('Refresh token reuse detected', 'REFRESH_REUSED');
  }
  if (record.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token expired', 'REFRESH_INVALID');
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId }, select: publicUserSelect });
  if (!user || !user.isActive) throw AppError.unauthorized('Account unavailable', 'REFRESH_INVALID');

  return prisma.$transaction(async (tx) => {
    // Conditional update guards against two concurrent refreshes with the same token.
    const { count } = await tx.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw AppError.unauthorized('Refresh token already used', 'REFRESH_INVALID');
    return issueTokens(user, meta, tx);
  });
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  try {
    const { jti } = verifyRefreshToken(token);
    await prisma.refreshToken.updateMany({
      where: { id: jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Invalid/expired token: nothing to revoke.
  }
}

export async function getSessionUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user || !user.isActive) throw AppError.unauthorized('Account unavailable');
  return user;
}

/** Remove expired/revoked tokens older than the refresh TTL. */
export async function purgeStaleTokens(): Promise<void> {
  const cutoff = new Date(Date.now() - REFRESH_TOKEN_TTL_MS);
  await prisma.refreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
  });
}
