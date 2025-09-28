// scripts/set-mother-password.ts
import 'dotenv/config'; // ← loads DATABASE_URL for scripts
import { PrismaClient } from '../app/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const name = process.argv[2];
  const pw   = process.argv[3];
  if (!name || !pw) {
    console.error('Usage: npx tsx scripts/set-mother-password.ts "<PreferredName>" "<Password>"');
    process.exit(1);
  }

  const hash = await bcrypt.hash(pw, 10);
  const res = await prisma.motherProfile.updateMany({
    where: { preferredName: { equals: name, mode: 'insensitive' } },
    data: { passwordHash: hash },
  });

  console.log(res.count ? `Updated ${res.count} record(s).` : `No MotherProfile found for "${name}".`);
}

main().finally(() => prisma.$disconnect());
