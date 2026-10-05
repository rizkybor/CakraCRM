import { Router, type Request } from 'express';
import { authenticate } from '../../middleware/auth';
import { loginLimiter, refreshLimiter } from '../../middleware/security';
import { validate } from '../../middleware/validate';
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from '../../lib/cookies';
import { loginSchema } from './auth.schema';
import * as authService from './auth.service';

const router = Router();

const clientMeta = (req: Request) => ({ ip: req.ip, userAgent: req.get('user-agent') });
const refreshCookie = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
};

router.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res) => {
  const result = await authService.login(req.body, clientMeta(req));
  setAuthCookies(res, result);
  res.json({ user: result.user });
});

router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const result = await authService.refresh(refreshCookie(req), clientMeta(req));
    setAuthCookies(res, result);
    res.json({ user: result.user });
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
});

router.post('/logout', async (req, res) => {
  await authService.logout(refreshCookie(req));
  clearAuthCookies(res);
  res.status(204).end();
});

router.get('/me', authenticate, async (req, res) => {
  const user = await authService.getSessionUser(req.user!.id);
  res.json({ user });
});

export default router;
