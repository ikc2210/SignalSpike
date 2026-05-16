import { prisma } from '@perplexity/db';
import { createPerplexityClient } from '@perplexity/provider-perplexity';
import { expandQueryPattern } from './template-expander.js';

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
    await prisma.runFinding.create({
      data: {
        runId: run.id,
        entityId: entityId ?? null,
        summary: result.content,
        topics: template.topics,
      },
    });

    // For discovery templates: create proposed entities from response
    if (template.templateType === 'entity_type_discovery') {
      await createProposedEntities(run.id, template.entityTypes, result.content);
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

async function createProposedEntities(
  runId: string,
  entityTypes: string[],
  content: string,
): Promise<void> {
  // Extract entity names from discovery response using Perplexity to parse structure
  // For v1: extract lines that look like entity names (capitalized phrases)
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  const candidates = lines
    .map((l) => l.replace(/^[\d.\-*•]+\s*/, '').trim())
    .filter((l) => l.length > 5 && l.length < 200)
    .slice(0, 10); // max 10 candidates per run

  const entityType = entityTypes[0] ?? 'executive_body';

  for (const name of candidates) {
    // Check if entity with similar name already exists
    const existing = await prisma.entity.findFirst({
      where: { name: { contains: name.slice(0, 30), mode: 'insensitive' } },
    });
    if (existing) continue;

    await prisma.entity.create({
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
  }
}

function defaultLayerForType(entityType: string): string {
  const regulated = ['frontier_developer', 'compute_infra_provider'];
  const standards = ['standards_body', 'safety_institute'];
  if (regulated.includes(entityType)) return 'regulated_entities';
  if (standards.includes(entityType)) return 'standards_agenda';
  return 'rule_setters';
}
