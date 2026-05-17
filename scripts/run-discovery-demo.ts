/**
 * Runs all active discovery templates directly against the demo database,
 * bypassing the BullMQ queue to avoid cross-database job races.
 *
 * Usage: DATABASE_URL=... tsx scripts/run-discovery-demo.ts
 */
import { prisma } from '@perplexity/db';
import { executeRun } from '@perplexity/core';

async function main() {
  const templates = await prisma.queryTemplate.findMany({
    where: { templateType: 'entity_type_discovery' },
    select: { id: true, name: true },
  });

  console.log(`Found ${templates.length} discovery templates — running sequentially...\n`);

  for (const t of templates) {
    console.log(`▶ ${t.name}`);
    try {
      const runId = await executeRun(t.id);
      console.log(`  ✓ run ${runId}\n`);
    } catch (err) {
      console.error(`  ✗ failed:`, (err as Error).message, '\n');
    }
  }

  await prisma.$disconnect();
  console.log('Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
