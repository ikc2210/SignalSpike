import { prisma } from '@perplexity/db';
import { createPerplexityClient } from '@perplexity/provider-perplexity';
import { expandQueryPattern } from './template-expander.js';
import { enqueueRun } from './queue.js';
import { extractAndPersistSignal } from './signal-extractor.js';

export async function executeRun(templateId: string, entityId?: string): Promise<string> {
  const template = await prisma.queryTemplate.findUniqueOrThrow({ where: { id: templateId } });
  const entity = entityId ? await prisma.entity.findUnique({ where: { id: entityId } }) : null;

  const queryExpanded = expandQueryPattern(template, entity);

  const run = await prisma.monitoringRun.create({
    data: {
      templateId,
      entityId: entityId ?? null,
      status: 'running',
      queryExpanded,
      startedAt: new Date(),
    },
  });

  try {
    const client = createPerplexityClient();

    const searchOptions =
      template.domainAllowlist.length > 0
        ? { domainAllowlist: template.domainAllowlist }
        : {};
    const result = await client.search(queryExpanded, searchOptions);

    // Persist sources from citations
    if (result.citations.length > 0) {
      await prisma.runSource.createMany({
        data: result.citations.map((url) => ({
          runId: run.id,
          url,
          domain: extractDomain(url),
        })),
      });
    }

    // Persist finding
    const finding = await prisma.runFinding.create({
      data: {
        runId: run.id,
        entityId: entityId ?? null,
        summary: result.content,
        topics: template.topics,
      },
    });

    // For discovery templates: process discovered entities
    if (template.templateType === 'entity_type_discovery') {
      await processDiscoveredEntities(run.id, template.entityTypes, result.content);
    }

    // For monitoring templates with a known entity: extract a normalized Signal
    if (template.templateType === 'entity_monitoring' && entity) {
      const sources = await prisma.runSource.findMany({ where: { runId: run.id } });
      // Non-fatal: extraction failure is logged inside extractAndPersistSignal
      await extractAndPersistSignal({ run, template, entity, finding, sources }).catch((err) => {
        console.error(
          `[run-engine] signal extraction threw for finding ${finding.id}:`,
          err instanceof Error ? err.message : String(err),
        );
      });
    }

    await prisma.monitoringRun.update({
      where: { id: run.id },
      data: {
        status: 'succeeded',
        rawResponse: result.rawResponse as object,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.monitoringRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });
    throw error;
  }

  return run.id;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function extractEntityNames(content: string): string[] {
  const names: string[] = [];

  // Primary: markdown section headers (## 1) Entity Name or ## Entity Name)
  const headerRe = /^#{1,3}\s+(?:\d+[.)]\s*)?(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(content)) !== null) {
    const name = (m[1] ?? '').replace(/\*\*/g, '').replace(/:\s*$/, '').trim();
    if (name.length >= 5 && name.length <= 150) names.push(name);
  }

  // Fallback: numbered list items
  if (names.length === 0) {
    const listRe = /^\d+[.)]\s+\*{0,2}([^*\n]+)\*{0,2}/gm;
    while ((m = listRe.exec(content)) !== null) {
      const name = (m[1] ?? '').trim();
      if (name.length >= 5 && name.length <= 150) names.push(name);
    }
  }

  const boilerplate = /^(bottom line|summary|overview|conclusion|key takeaways?|introduction|background|note)$/i;
  return [...new Set(names)].filter((n) => !boilerplate.test(n)).slice(0, 10);
}

async function processDiscoveredEntities(
  runId: string,
  entityTypes: string[],
  content: string,
): Promise<void> {
  const entityType = entityTypes[0] ?? 'executive_body';
  const names = extractEntityNames(content);

  const monitoringTemplates = await prisma.queryTemplate.findMany({
    where: { templateType: 'entity_monitoring', active: true, entityTypes: { has: entityType } },
    select: { id: true },
  });

  for (const name of names) {
    const existing = await prisma.entity.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      if (existing.approvalState !== 'rejected') {
        await Promise.all(monitoringTemplates.map((t) => enqueueRun(t.id, existing.id)));
      }
      continue;
    }

    const newEntity = await prisma.entity.create({
      data: {
        name,
        entityType,
        defaultLayer: defaultLayerForType(entityType),
        jurisdictions: ['US'],
        sectors: ['ai'],
        approvalState: 'proposed',
        discoveredBy: runId,
      },
    });
    await Promise.all(monitoringTemplates.map((t) => enqueueRun(t.id, newEntity.id)));
  }
}

function defaultLayerForType(entityType: string): string {
  const regulated = ['frontier_developer', 'compute_infra_provider'];
  const standards = ['standards_body', 'safety_institute'];
  if (regulated.includes(entityType)) return 'regulated_entities';
  if (standards.includes(entityType)) return 'standards_agenda';
  return 'rule_setters';
}
