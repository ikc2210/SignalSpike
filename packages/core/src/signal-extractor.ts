import Anthropic from '@anthropic-ai/sdk';
import { prisma, Prisma } from '@perplexity/db';
import type { Entity, MonitoringRun, QueryTemplate, RunFinding, RunSource } from '@perplexity/db';
import {
  SIGNAL_TYPES,
  STANCES,
  PRIORITY_DIRECTIONS,
  safeValidateSignal,
} from '@perplexity/ontology';
import type { EntityType } from '@perplexity/ontology';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignalExtractionContext {
  run: MonitoringRun;
  template: QueryTemplate;
  entity: Entity;
  finding: RunFinding;
  sources: RunSource[];
}

// Raw output from the Claude tool call — all semantic fields optional so that
// partial extraction still yields a valid base signal.
interface ExtractionResult {
  signalType?: string;
  title?: string;
  summary?: string;
  importance?: number;
  confidence?: number;
  topicTags?: string[];
  jurisdictionTags?: string[];
  // activities
  changeType?: string;
  eventDate?: string;
  actorsMentioned?: string[];
  // positions
  topic?: string;
  positionLabel?: string;
  stance?: string;
  strength?: number;
  evidenceSnippets?: string[];
  // priorities
  priorityLabel?: string;
  priorityDirection?: string;
  momentum?: number;
  rationale?: string;
  // entity-type details (untyped; validated by Zod downstream)
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Claude client (singleton)
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Extraction tool schema
// Single tool used for all objectives and entity types — the prompt guides
// the model on which fields to populate.
// ---------------------------------------------------------------------------

const CLASSIFY_SIGNAL_TOOL: Anthropic.Tool = {
  name: 'classify_signal',
  description:
    'Extract and classify structured signal fields from a policy monitoring finding.',
  input_schema: {
    type: 'object' as const,
    properties: {
      signalType: {
        type: 'string',
        enum: [...SIGNAL_TYPES],
        description: 'The most specific signal type that describes this event.',
      },
      title: {
        type: 'string',
        description: 'Concise signal title, ≤15 words.',
      },
      summary: {
        type: 'string',
        description: '1–3 sentence neutral summary of the signal.',
      },
      importance: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description:
          'Dashboard relevance: how important is this for a policy analyst? 1=trivial, 100=critical.',
      },
      confidence: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description:
          'Extraction certainty: how confident are you in the classification? 1=speculative, 100=certain.',
      },
      topicTags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Refined topic tags (e.g. "frontier model thresholds", "compute export controls").',
      },
      jurisdictionTags: {
        type: 'array',
        items: { type: 'string' },
        description: 'ISO 3166 codes, regional codes (EU), or "global".',
      },
      // activities
      changeType: {
        type: 'string',
        description: '[activities] Short label for the type of change (e.g. "regulatory proposal", "product launch").',
      },
      eventDate: {
        type: 'string',
        description: '[activities] YYYY-MM-DD date the event occurred, if determinable.',
      },
      actorsMentioned: {
        type: 'array',
        items: { type: 'string' },
        description: '[activities] Named entities mentioned as participants or targets.',
      },
      // positions
      topic: {
        type: 'string',
        description: '[positions] The specific policy topic the entity is taking a position on.',
      },
      positionLabel: {
        type: 'string',
        description: '[positions] Short human-readable label (e.g. "supports mandatory pre-deployment evals").',
      },
      stance: {
        type: 'string',
        enum: [...STANCES],
        description: '[positions] The entity\'s stance on the topic.',
      },
      strength: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        description: '[positions] How strongly held: 1=weakly signaled, 5=explicitly committed.',
      },
      evidenceSnippets: {
        type: 'array',
        items: { type: 'string' },
        description: '[positions] Direct quotes or close paraphrases supporting the stance.',
      },
      // priorities
      priorityLabel: {
        type: 'string',
        description: '[priorities] Short label for the priority area (e.g. "AI safety evals").',
      },
      priorityDirection: {
        type: 'string',
        enum: [...PRIORITY_DIRECTIONS],
        description: '[priorities] Direction of the priority shift.',
      },
      momentum: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        description: '[priorities] Signal strength: 1=weak/single signal, 5=strong/sustained pattern.',
      },
      rationale: {
        type: 'string',
        description: '[priorities] Evidence-based reasoning for why this counts as a priority shift.',
      },
      // entity-type details
      details: {
        type: 'object',
        description:
          'Entity-type-specific structured details. Populate only the fields relevant to the entity type described in the system prompt.',
      },
    },
    required: ['title', 'summary', 'importance', 'confidence'],
  },
};

// ---------------------------------------------------------------------------
// System prompt (cacheable — changes only when the ontology changes)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a policy signal classifier specializing in AI governance and technology regulation.

Given a raw monitoring finding about an entity, extract structured signal fields using the classify_signal tool.

Signal type taxonomy (choose the most specific applicable type):
- publication: strategy_published, guidance_issued, standard_published, benchmark_released, company_policy_updated, report_published, transparency_report_published
- process: bill_introduced, bill_advanced, bill_enacted, executive_action_issued, rule_proposed, rule_finalized, consultation_opened, consultation_closed, hearing_scheduled, hearing_held, court_decision_issued
- participation: testimony_submitted, witness_testified, comment_letter_submitted, coalition_letter_signed, advisory_member_appointed
- disclosure: lobbying_filing_submitted, contributions_report_filed, incident_disclosed
- personnel: hire, departure, promotion, board_appointment, revolving_door_move, team_created, team_reorganized
- operational: capability_released, model_release_decision, deployment_restriction_changed, access_policy_changed, terms_changed, jurisdiction_launch, jurisdiction_withdrawal, government_contract_accepted, government_contract_declined, compliance_program_changed

Scoring guidance:
- importance (1–100): weight by the signal's relevance to AI policy practitioners. Major rulemaking or frontier capability releases = 70–100. Routine filings or minor updates = 10–30.
- confidence (1–100): reflect how clearly the finding supports your classification. Direct quote from primary source = 80–100. Inferred from indirect evidence = 20–50.

Always fill title, summary, importance, and confidence. Fill objective-specific and details fields only when the information is clearly present in the finding.`;

// ---------------------------------------------------------------------------
// Deterministic prefill — derived from run/template/entity metadata only
// ---------------------------------------------------------------------------

function buildPrefill(ctx: SignalExtractionContext): {
  runId: string;
  runFindingId: string;
  entityId: string;
  entityType: string;
  queryTemplateId: string;
  templateType: string;
  objective: string;
  sourceUrls: string[];
  sourceDomains: string[];
  topicTags: string[];
  jurisdictionTags: string[];
  observedAt: Date;
  // fallback semantic values overridden by extraction
  title: string;
  summary: string;
  importance: number;
  confidence: number;
} {
  const { run, template, entity, finding, sources } = ctx;

  return {
    runId: run.id,
    runFindingId: finding.id,
    entityId: entity.id,
    entityType: entity.entityType,
    queryTemplateId: template.id,
    templateType: template.templateType,
    objective: template.objective,
    sourceUrls: sources.map((s) => s.url),
    sourceDomains: sources.map((s) => s.domain).filter((d): d is string => d !== null),
    topicTags: finding.topics.length > 0 ? finding.topics : template.topics,
    jurisdictionTags: entity.jurisdictions,
    observedAt: run.completedAt ?? run.createdAt,
    title: finding.summary.slice(0, 150).replace(/\n/g, ' '),
    summary: finding.summary.slice(0, 500),
    importance: 50,
    confidence: 50,
  };
}

// ---------------------------------------------------------------------------
// User prompt — carries the finding content and extraction context
// ---------------------------------------------------------------------------

function buildUserPrompt(ctx: SignalExtractionContext): string {
  const { template, entity, finding } = ctx;

  const detailsGuide = entityTypeDetailsGuide(entity.entityType);

  return `Entity: ${entity.name} (${entity.entityType})
Template objective: ${template.objective}
Topics in scope: ${template.topics.join(', ') || 'general'}
Jurisdictions: ${entity.jurisdictions.join(', ')}

${detailsGuide ? `For the details field, this is a ${entity.entityType} entity — relevant fields: ${detailsGuide}\n\n` : ''}Finding summary:
${finding.summary}`;
}

function entityTypeDetailsGuide(entityType: string): string {
  const guides: Record<string, string> = {
    national_legislature: 'billNumber, committee, legislativeStage',
    executive_body: 'instrumentType, issuingOffice, implementationStatus',
    cross_cutting_regulator: 'docketNumber, enforcementType, proceedingStage',
    sectoral_regulator: 'sector, guidanceType, approvalStatus',
    court_tribunal: 'caseName, docketNumber, proceduralPosture',
    international_organization: 'negotiationTrack, instrumentStatus, workingGroup',
    frontier_developer: 'modelName, releaseType, deploymentScope',
    compute_infra_provider: 'productName, infraType, exportControlHook',
    standards_body: 'standardNumber, draftStage, commentWindow',
    safety_institute: 'evaluationFramework, benchmarkName, partnerOrganizations',
  };
  return guides[entityType] ?? '';
}

// ---------------------------------------------------------------------------
// Semantic extraction via Claude
// ---------------------------------------------------------------------------

async function extractSemanticFields(ctx: SignalExtractionContext): Promise<ExtractionResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: buildUserPrompt(ctx),
      },
    ],
    tools: [CLASSIFY_SIGNAL_TOOL],
    tool_choice: { type: 'any' },
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Claude did not return a tool use block');
  }

  return toolUse.input as ExtractionResult;
}

// ---------------------------------------------------------------------------
// Merge prefill + extraction → Prisma create payload
// ---------------------------------------------------------------------------

function buildCreatePayload(
  prefill: ReturnType<typeof buildPrefill>,
  extracted: ExtractionResult,
  objective: string,
) {
  const base = {
    runId: prefill.runId,
    runFindingId: prefill.runFindingId,
    entityId: prefill.entityId,
    entityType: prefill.entityType,
    queryTemplateId: prefill.queryTemplateId,
    templateType: prefill.templateType,
    objective,
    signalType: SIGNAL_TYPES.includes(extracted.signalType as never)
      ? (extracted.signalType ?? null)
      : null,
    title: extracted.title ?? prefill.title,
    summary: extracted.summary ?? prefill.summary,
    sourceUrls: prefill.sourceUrls,
    sourceDomains: prefill.sourceDomains,
    topicTags: extracted.topicTags ?? prefill.topicTags,
    jurisdictionTags: extracted.jurisdictionTags ?? prefill.jurisdictionTags,
    observedAt: prefill.observedAt,
    importance: clamp(extracted.importance ?? prefill.importance, 1, 100),
    confidence: clamp(extracted.confidence ?? prefill.confidence, 1, 100),
    details: buildDetails(prefill.entityType, extracted.details),
  };

  if (objective === 'activities') {
    return {
      ...base,
      changeType: extracted.changeType ?? 'unclassified',
      eventDate: parseDate(extracted.eventDate) ?? null,
      actorsMentioned: extracted.actorsMentioned ?? [],
    };
  }

  if (objective === 'positions') {
    return {
      ...base,
      topic: extracted.topic ?? prefill.topicTags[0] ?? 'general',
      positionLabel: extracted.positionLabel ?? 'position not classified',
      stance: STANCES.includes(extracted.stance as never) ? (extracted.stance ?? 'unclear') : 'unclear',
      strength: clamp(extracted.strength ?? 1, 1, 5),
      evidenceSnippets: extracted.evidenceSnippets ?? [],
    };
  }

  // priorities
  return {
    ...base,
    priorityLabel: extracted.priorityLabel ?? prefill.topicTags[0] ?? 'general',
    priorityDirection: PRIORITY_DIRECTIONS.includes(extracted.priorityDirection as never)
      ? (extracted.priorityDirection ?? 'stable')
      : 'stable',
    momentum: clamp(extracted.momentum ?? 1, 1, 5),
    rationale: extracted.rationale ?? prefill.summary,
    supportingSignalIds: [],
  };
}

function buildDetails(
  entityType: string,
  raw: Record<string, unknown> | undefined,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (!raw) return Prisma.JsonNull;
  return { entityType, ...raw };
}

function clamp(v: number | undefined, min: number, max: number): number {
  const n = typeof v === 'number' ? v : min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract a Signal from a completed RunFinding and persist it.
 * Returns the Signal id on success, null if the finding has no entity (discovery runs).
 *
 * Extraction failures are non-fatal: if Claude fails or the output fails validation,
 * a Signal is still persisted using deterministic prefill values only.
 */
export async function extractAndPersistSignal(
  ctx: SignalExtractionContext,
): Promise<string | null> {
  // Signal extraction only applies to entity-scoped (monitoring) runs
  if (!ctx.run.entityId) return null;

  const prefill = buildPrefill(ctx);
  const objective = ctx.template.objective;

  let extracted: ExtractionResult = {};
  let extractionFailed = false;

  try {
    extracted = await extractSemanticFields(ctx);
  } catch (err) {
    extractionFailed = true;
    console.warn(
      `[signal-extractor] semantic extraction failed for finding ${ctx.finding.id}:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  const payload = buildCreatePayload(prefill, extracted, objective);

  // Validate before persisting — fall back to prefill-only if the merged
  // payload still fails (e.g. because extracted values are out of range).
  const validation = safeValidateSignal({
    ...payload,
    id: 'placeholder', // not known until DB insert; validated shape only
    extractedAt: new Date().toISOString().slice(0, 10),
    observedAt: payload.observedAt.toISOString().slice(0, 10),
    entityType: payload.entityType as EntityType,
    signalType: payload.signalType ?? null,
  });

  if (!validation.success && !extractionFailed) {
    console.warn(
      `[signal-extractor] validation failed for finding ${ctx.finding.id}:`,
      validation.error.flatten(),
    );
  }

  const signal = await prisma.signal.create({ data: payload });
  return signal.id;
}
