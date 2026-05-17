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

interface DiscoveredEntity {
  name: string;
  aliases: string[];
}

function parseNameAndAliases(raw: string): DiscoveredEntity {
  // Strip trailing inline description first
  const beforeDesc = raw
    .replace(/\s*[—–]\s*.+$/, '')   // em/en dash: "Name — description"
    .replace(/\s+-\s+.+$/, '')       // spaced hyphen: "Name - description"
    .replace(/:\s+.+$/, '')          // colon with text: "Name: description"
    .replace(/:$/, '')               // bare trailing colon: "Name:"
    .trim();

  // "Full Name (ACRONYM)" — parenthetical is short uppercase token
  const acronymMatch = beforeDesc.match(/^(.+?)\s*\(([A-Z][A-Z0-9/\-]{1,15})\)\s*$/);
  if (acronymMatch) {
    return { name: (acronymMatch[1] ?? '').trim(), aliases: [acronymMatch[2] ?? ''] };
  }

  // "ACRONYM (Full Name)" — parenthetical is long mixed-case string
  const reverseMatch = beforeDesc.match(/^([A-Z][A-Z0-9/\-]{1,15})\s*\((.{10,})\)\s*$/);
  if (reverseMatch) {
    return { name: (reverseMatch[2] ?? '').trim(), aliases: [reverseMatch[1] ?? ''] };
  }

  // No parenthetical alias — strip any remaining trailing parens and return
  const name = beforeDesc.replace(/\s*\([^)]*\)$/, '').trim() || raw.trim();
  return { name, aliases: [] };
}

function extractDiscoveredEntities(content: string): DiscoveredEntity[] {
  const rawNames: string[] = [];
  let m: RegExpExecArray | null;

  // Pass 1: bold entity names in list items — "1. **Name** — description" or "- **Name**: ..."
  const boldListRe = /^(?:\d+[.)]\s+|[-*]\s+)\*\*([^*\n]{2,80})\*\*/gm;
  while ((m = boldListRe.exec(content)) !== null) {
    rawNames.push((m[1] ?? '').trim());
  }

  // Pass 2: plain numbered list items with descriptions stripped.
  if (rawNames.length === 0) {
    const listRe = /^\d+[.)]\s+(.+)$/gm;
    while ((m = listRe.exec(content)) !== null) {
      rawNames.push((m[1] ?? '').replace(/\*\*/g, '').trim());
    }
  }

  // Pass 3: markdown headers as last resort.
  if (rawNames.length === 0) {
    const headerRe = /^#{1,3}\s+(?:\d+[.)]\s*)?(.+)$/gm;
    while ((m = headerRe.exec(content)) !== null) {
      rawNames.push((m[1] ?? '').replace(/\*\*/g, '').replace(/:\s*$/, '').trim());
    }
  }

  const seen = new Set<string>();
  const results: DiscoveredEntity[] = [];

  for (const raw of rawNames) {
    const parsed = parseNameAndAliases(raw);
    if (!isEntityName(parsed.name)) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(parsed);
    if (results.length >= 10) break;
  }

  return results;
}

// Reject strings that are section titles or descriptions rather than entity names.
function isEntityName(s: string): boolean {
  if (s.length < 2 || s.length > 80) return false;

  // Entity names are typically ≤6 words; longer strings are usually sentences.
  if (s.split(/\s+/).length > 6) return false;

  // Trailing colon means it's a section label, not a name (belt-and-suspenders
  // after parseNameAndAliases already strips bare colons).
  if (s.endsWith(':')) return false;

  // Date strings: "Jan. 25, 2024", "Q1 2025", standalone 4-digit years.
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d/i.test(s)) return false;
  if (/\b(19|20)\d{2}\b/.test(s)) return false;

  // Generic activity/category descriptors — not institution names.
  if (/\b(activity|activities|related work|related legislation|effort|efforts|area|areas|topic|topics|category|categories)\b/i.test(s)) return false;

  // Reject bill/act titles — these are laws, not organizations or bodies.
  if (/\b(Act|Bill|Amendment|Resolution|Initiative|Directive|Regulation|Statute)\s*$/i.test(s)) return false;

  // Reject section-header opening words.
  if (/^(why|how|what|when|where|who|most|key|top|bottom|other|additional|these|this|the |a |an |note|see|for|all|about|regarding|important|central|core|primary|main|major)/i.test(s)) {
    return false;
  }

  // Reject questions.
  if (s.endsWith('?')) return false;

  // Reject explicit boilerplate section titles.
  if (/^(summary|overview|conclusion|background|introduction|context|analysis|finding|recommendation|bottom line|key takeaway)/i.test(s)) {
    return false;
  }

  return true;
}

async function processDiscoveredEntities(
  runId: string,
  entityTypes: string[],
  content: string,
): Promise<void> {
  const entityType = entityTypes[0] ?? 'executive_body';
  const discovered = extractDiscoveredEntities(content);

  const monitoringTemplates = await prisma.queryTemplate.findMany({
    where: { templateType: 'entity_monitoring', active: true, entityTypes: { has: entityType } },
    select: { id: true },
  });

  // Track entity IDs enqueued during this discovery call. MonitoringRun records
  // are only written when a worker picks up and starts a job, so the DB recency
  // check would be blind to jobs that are queued-but-not-yet-started. This set
  // closes that gap and also handles the same entity appearing twice in the
  // discovery response under different names.
  const enqueuedThisRun = new Set<string>();

  for (const d of discovered) {
    const terms = [d.name, ...d.aliases];

    // Alias-aware lookup: match on entity name OR any stored alias
    const existing = await prisma.entity.findFirst({
      where: {
        OR: terms.flatMap((term) => [
          { name: { equals: term, mode: 'insensitive' as const } },
          { aliases: { some: { alias: { equals: term, mode: 'insensitive' as const } } } },
        ]),
      },
    });

    if (existing) {
      // Enrich stored aliases with any newly parsed ones
      if (d.aliases.length > 0) {
        await prisma.entityAlias.createMany({
          data: d.aliases.map((alias) => ({ entityId: existing.id, alias })),
          skipDuplicates: true,
        });
      }
      if (existing.approvalState !== 'rejected' && !enqueuedThisRun.has(existing.id)) {
        const recentRun = await prisma.monitoringRun.findFirst({
          where: {
            entityId: existing.id,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          select: { id: true },
        });
        if (!recentRun) {
          enqueuedThisRun.add(existing.id);
          await Promise.all(monitoringTemplates.map((t) => enqueueRun(t.id, existing.id)));
        }
      }
      continue;
    }

    const newEntity = await prisma.entity.create({
      data: {
        name: d.name,
        entityType,
        defaultLayer: defaultLayerForType(entityType),
        jurisdictions: ['US'],
        sectors: ['ai'],
        approvalState: 'proposed',
        discoveredBy: runId,
      },
    });

    if (d.aliases.length > 0) {
      await prisma.entityAlias.createMany({
        data: d.aliases.map((alias) => ({ entityId: newEntity.id, alias })),
        skipDuplicates: true,
      });
    }

    enqueuedThisRun.add(newEntity.id);
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
