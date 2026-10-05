import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { apiLimiter, requireAjaxHeader } from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/error';
import routes from './routes';

export function createApp() {
  const app = express();

  // Render terminates TLS at its proxy; needed for secure cookies & per-IP rate limits.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Requests without Origin (curl, health checks, same-origin) are allowed;
        // browsers always send Origin on cross-origin requests.
        callback(null, !origin || env.allowedOrigins.includes(origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', apiLimiter, requireAjaxHeader, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
