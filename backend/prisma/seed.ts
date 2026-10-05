/**
 * Development seed: demo users, leads, deals and activities.
 * Run with `npm run seed` (never needed in production — the first admin is
 * created automatically from BOOTSTRAP_ADMIN_* env vars).
 */
import { PrismaClient, type DealStage, type LeadStatus } from '@prisma/client';
import argon2 from 'argon2';

try {
  process.loadEnvFile();
} catch {
  // No .env file - rely on the real environment.
}

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Password123';

async function upsertUser(name: string, email: string, role: 'ADMIN' | 'MANAGER' | 'SALES') {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, role, passwordHash: await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id }) },
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Refusing to seed demo data in production (set ALLOW_PRODUCTION_SEED=true to override).');
  }

  const admin = await upsertUser('Admin Cakra', 'admin@jendelacakra.id', 'ADMIN');
  const manager = await upsertUser('Maya Manager', 'manager@jendelacakra.id', 'MANAGER');
  const sales = await upsertUser('Sandi Sales', 'sales@jendelacakra.id', 'SALES');

  if ((await prisma.lead.count()) > 0) {
    console.log('Leads already exist, skipping demo data.');
    return;
  }

  const leads: Array<[string, string, string, LeadStatus, string]> = [
    ['Budi Santoso', 'budi@majujaya.co.id', 'PT Maju Jaya', 'QUALIFIED', sales.id],
    ['Siti Rahma', 'siti@nusantaratech.id', 'Nusantara Tech', 'CONTACTED', sales.id],
    ['Andi Wijaya', 'andi@sinarabadi.com', 'CV Sinar Abadi', 'NEW', manager.id],
    ['Dewi Lestari', 'dewi@kopikita.id', 'Kopi Kita', 'QUALIFIED', sales.id],
    ['Rudi Hartono', 'rudi@logistikcepat.id', 'Logistik Cepat', 'LOST', manager.id],
  ];

  const stages: DealStage[] = ['LEAD_IN', 'CONTACT_MADE', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST'];

  for (const [i, [name, email, company, status, ownerId]] of leads.entries()) {
    const lead = await prisma.lead.create({
      data: { name, email, company, status, ownerId, phone: `+62 812 0000 00${i}`, source: 'Website' },
    });
    const stage = stages[i % stages.length]!;
    const closed = stage === 'WON' || stage === 'LOST';
    const deal = await prisma.deal.create({
      data: {
        title: `Website & Digital Marketing - ${company}`,
        value: 15_000_000 + i * 7_500_000,
        stage,
        leadId: lead.id,
        ownerId,
        closedAt: closed ? new Date(Date.now() - i * 20 * 24 * 60 * 60 * 1000) : null,
      },
    });
    await prisma.activity.createMany({
      data: [
        { type: 'CALL', subject: `Panggilan perkenalan dengan ${name}`, leadId: lead.id, userId: ownerId, completedAt: new Date() },
        { type: 'MEETING', subject: 'Presentasi proposal', leadId: lead.id, dealId: deal.id, userId: ownerId, dueAt: new Date(Date.now() + 3 * 864e5) },
        { type: 'NOTE', subject: 'Klien tertarik paket SEO', leadId: lead.id, userId: admin.id },
      ],
    });
  }

  console.log(`Seeded demo data. Login with any of admin@ / manager@ / sales@jendelacakra.id and password "${DEMO_PASSWORD}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
