import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

async function main() {
  const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue('monitor', { connection });
  const prisma = new PrismaClient();

  const waiting = await queue.getWaiting(0, -1);
  console.log(`Found ${waiting.length} waiting jobs.`);

  let removed = 0;
  let kept = 0;

  for (const job of waiting) {
    const template = await prisma.queryTemplate.findUnique({
      where: { id: job.data.templateId },
      select: { objective: true, name: true },
    });

    if (!template) {
      console.log(`  [skip] job ${job.id} — template not found`);
      continue;
    }

    if (template.objective === 'activities' || template.objective === 'positions') {
      await job.remove();
      console.log(`  [removed] ${template.name} (${template.objective})`);
      removed++;
    } else {
      console.log(`  [kept]    ${template.name} (${template.objective})`);
      kept++;
    }
  }

  console.log(`\nDone — removed ${removed}, kept ${kept} priorities jobs.`);

  await queue.close();
  await connection.quit();
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
