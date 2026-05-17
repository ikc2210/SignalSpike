import { prisma } from '@perplexity/db';
import { executeRun } from '@perplexity/core';

async function main() {
  const templates = await prisma.queryTemplate.findMany({
    where: { templateType: 'entity_monitoring', active: true },
    select: { id: true, name: true, entityTypes: true },
  });

  const entities = await prisma.entity.findMany({
    where: { approvalState: 'approved', active: true },
    select: { id: true, name: true, entityType: true },
  });

  const pairs: { templateId: string; templateName: string; entityId: string; entityName: string }[] = [];
  for (const t of templates) {
    for (const e of entities) {
      if (t.entityTypes.includes(e.entityType)) {
        pairs.push({ templateId: t.id, templateName: t.name, entityId: e.id, entityName: e.name });
      }
    }
  }

  console.log(`${templates.length} monitoring templates × ${entities.length} entities = ${pairs.length} runs\n`);

  let done = 0;
  let failed = 0;
  for (const p of pairs) {
    process.stdout.write(`[${done + failed + 1}/${pairs.length}] ${p.templateName} → ${p.entityName} ... `);
    try {
      await executeRun(p.templateId, p.entityId);
      done++;
      console.log('✓');
    } catch (err) {
      failed++;
      console.log(`✗ ${(err as Error).message}`);
    }
  }

  await prisma.$disconnect();
  console.log(`\nDone. ${done} succeeded, ${failed} failed.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
