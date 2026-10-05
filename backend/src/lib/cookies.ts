import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from './tokens';

export const ACCESS_COOKIE = 'cakra_at';
export const REFRESH_COOKIE = 'cakra_rt';

// Frontend & backend live on different Render subdomains, so production needs
// SameSite=None (which in turn requires Secure). Override with COOKIE_SAMESITE
// when both apps share a parent domain (e.g. app.example.com / api.example.com).
const sameSite = env.COOKIE_SAMESITE ?? (env.isProduction ? 'none' : 'lax');

const base: CookieOptions = {
  httpOnly: true,
  secure: env.isProduction || sameSite === 'none',
  sameSite,
  domain: env.COOKIE_DOMAIN,
};

const accessCookie: CookieOptions = { ...base, path: '/' };
// Refresh token is only ever sent to the auth endpoints.
const refreshCookie: CookieOptions = { ...base, path: '/api/auth' };

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...accessCookie, maxAge: ACCESS_TOKEN_TTL_MS });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...refreshCookie, maxAge: REFRESH_TOKEN_TTL_MS });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, accessCookie);
  res.clearCookie(REFRESH_COOKIE, refreshCookie);
}
