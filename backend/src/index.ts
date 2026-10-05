import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './lib/prisma';
import { hashPassword } from './lib/password';
import { purgeStaleTokens } from './modules/auth/auth.service';

/**
 * Creates the first ADMIN account when the users table is empty, so a fresh
 * Render deploy is usable without shell access.
 */
async function bootstrapAdmin() {
  if ((await prisma.user.count()) > 0) return;
  if (!env.BOOTSTRAP_ADMIN_EMAIL || !env.BOOTSTRAP_ADMIN_PASSWORD) {
    console.warn('No users exist. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD to create the first admin.');
    return;
  }
  await prisma.user.create({
    data: {
      name: env.BOOTSTRAP_ADMIN_NAME,
      email: env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
      passwordHash: await hashPassword(env.BOOTSTRAP_ADMIN_PASSWORD),
      role: 'ADMIN',
    },
  });
  console.log(`Bootstrap admin created: ${env.BOOTSTRAP_ADMIN_EMAIL}`);
}

async function main() {
  await prisma.$connect();
  await bootstrapAdmin();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`CakraCRM API listening on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`Allowed origins: ${env.allowedOrigins.join(', ')}`);
  });

  const purge = () => purgeStaleTokens().catch((err) => console.error('Token purge failed', err));
  void purge();
  const purgeTimer = setInterval(purge, 6 * 60 * 60 * 1000);
  purgeTimer.unref();

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(async (err) => {
  console.error('Failed to start server', err);
  await prisma.$disconnect();
  process.exit(1);
});
