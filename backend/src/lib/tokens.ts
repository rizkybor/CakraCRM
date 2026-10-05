import crypto from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';

const ISSUER = 'cakracrm';
const ACCESS_AUDIENCE = 'cakracrm:access';
const REFRESH_AUDIENCE = 'cakracrm:refresh';

export interface AccessTokenClaims {
  sub: string;
  role: Role;
}

export interface RefreshTokenClaims {
  sub: string;
  jti: string;
}

export const ACCESS_TOKEN_TTL_MS = env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export function signAccessToken(user: { id: string; role: Role }): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: ISSUER,
    audience: ACCESS_AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: ACCESS_AUDIENCE,
  }) as JwtPayload;
  if (!payload.sub || !payload.role) throw new Error('Malformed access token');
  return { sub: payload.sub, role: payload.role as Role };
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    jwtid: jti,
    issuer: ISSUER,
    audience: REFRESH_AUDIENCE,
    expiresIn: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: REFRESH_AUDIENCE,
  }) as JwtPayload;
  if (!payload.sub || !payload.jti) throw new Error('Malformed refresh token');
  return { sub: payload.sub, jti: payload.jti };
}

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
