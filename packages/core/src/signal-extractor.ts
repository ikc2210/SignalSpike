import Anthropic from '@anthropic-ai/sdk';
import { prisma, Prisma } from '@perplexity/db';
import type { Entity, MonitoringRun, QueryTemplate, RunFinding, RunSource } from '@perplexity/db';
import {
  SIGNAL_TYPES,
  STANCES,
  PRIORITY_DIRECTIONS,
} from '@perplexity/ontology';

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
export interface ExtractionResult {
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

// The shape buildPrefill returns — exported for testing
export interface SignalPrefill {
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
  title: string;
  summary: string;
  importance: number;
  confidence: number;
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

// Exported only for test injection — do not call in production code.
export function _setClientForTest(client: Anthropic): void {
  _client = client;
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
        description: "[positions] The entity's stance on the topic.",
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

Always fill title, summary, importance, confidence, topicTags, and jurisdictionTags.

Objective-specific fields — you MUST populate all of these for the objective stated in the user prompt:
- activities → changeType (required), eventDate (if determinable), actorsMentioned
- positions → topic (required: the specific policy topic), positionLabel (required: ≤10-word label for the position), stance (required: support/oppose/mixed/unclear/monitoring), strength (required: 1–5), evidenceSnippets (required: pull direct quotes or close paraphrases from the finding)
- priorities → priorityLabel (required), priorityDirection (required: rising/stable/falling), momentum (required: 1–5), rationale (required)

For positions: if the finding describes the entity's view on multiple topics, classify the single most policy-relevant one.
Fill entity-type-specific details fields only when the information is clearly present.`;

// ---------------------------------------------------------------------------
// Deterministic prefill — derived from run/template/entity metadata only.
// Never fails — always produces a valid base to fall back to.
// ---------------------------------------------------------------------------

export function buildPrefill(ctx: SignalExtractionContext): SignalPrefill {
  const { run, template, entity, finding, sources } = ctx;

  const rawTitle = finding.summary.slice(0, 150).replace(/\n/g, ' ').trim();

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
    // finding.createdAt is set by Prisma immediately after Perplexity returns —
    // more accurate than run.completedAt which is set after extraction finishes.
    observedAt: finding.createdAt,
    title: rawTitle || `${entity.name} — ${template.objective} signal`,
    summary: finding.summary.slice(0, 500) || '(no summary available)',
    importance: 50,
    confidence: 50,
  };
}

// ---------------------------------------------------------------------------
// User prompt — carries the finding content and extraction context
// ---------------------------------------------------------------------------

function buildObjectiveInstructions(objective: string): string {
  switch (objective) {
    case 'activities':
      return 'Populate: changeType (what kind of action/event?), eventDate (YYYY-MM-DD if stated), actorsMentioned.';
    case 'positions':
      return 'Populate: topic (what policy topic is the entity taking a position on?), positionLabel (≤10-word label, e.g. "supports mandatory pre-deployment safety evals"), stance (support/oppose/mixed/unclear/monitoring), strength (1–5, where 5 = explicitly committed), evidenceSnippets (copy direct quotes or close paraphrases from the finding text that reveal the stance — include at least one if any exist).';
    case 'priorities':
      return 'Populate: priorityLabel (short label for the priority area), priorityDirection (rising/stable/falling), momentum (1–5), rationale (why does this finding indicate a priority shift?).';
    default:
      return '';
  }
}

function buildUserPrompt(ctx: SignalExtractionContext): string {
  const { template, entity, finding } = ctx;
  const detailsGuide = entityTypeDetailsGuide(entity.entityType);
  const objectiveInstructions = buildObjectiveInstructions(template.objective);

  return `Entity: ${entity.name} (${entity.entityType})
Objective: ${template.objective}
Topics in scope: ${template.topics.join(', ') || 'general'}
Jurisdictions: ${entity.jurisdictions.join(', ')}

${objectiveInstructions}
${detailsGuide ? `\nFor the details field, relevant fields for ${entity.entityType}: ${detailsGuide}` : ''}

Finding:
${finding.summary}`;
}

function entityTypeDetailsGuide(entityType: string): string {
  const guides: Record<string, string> = {
    national_legislature:    'billNumber, committee, legislativeStage',
    executive_body:          'instrumentType, issuingOffice, implementationStatus',
    cross_cutting_regulator: 'docketNumber, enforcementType, proceedingStage',
    sectoral_regulator:      'sector, guidanceType, approvalStatus',
    court_tribunal:          'caseName, docketNumber, proceduralPosture',
    international_organization: 'negotiationTrack, instrumentStatus, workingGroup',
    frontier_developer:      'modelName, releaseType, deploymentScope',
    compute_infra_provider:  'productName, infraType, exportControlHook',
    standards_body:          'standardNumber, draftStage, commentWindow',
    safety_institute:        'evaluationFramework, benchmarkName, partnerOrganizations',
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
    messages: [{ role: 'user', content: buildUserPrompt(ctx) }],
    tools: [CLASSIFY_SIGNAL_TOOL],
    // Force this specific tool — we always want structured output.
    tool_choice: { type: 'tool', name: 'classify_signal' },
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Claude did not return a tool use block');
  }

  return toolUse.input as ExtractionResult;
}

// ---------------------------------------------------------------------------
// Merge prefill + extraction → Prisma create payload
// Exported for unit testing.
// ---------------------------------------------------------------------------

export function buildCreatePayload(
  prefill: SignalPrefill,
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

export function clamp(v: number | undefined, min: number, max: number): number {
  const n = typeof v === 'number' ? v : min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

// ---------------------------------------------------------------------------
// Null-result detection
// Perplexity sometimes returns a "I couldn't find/verify..." response when
// the search yields nothing useful. These are not signals — suppress them.
// ---------------------------------------------------------------------------

const NULL_RESULT_PATTERNS = [
  /^i couldn'?t (verify|find|identify|confirm|determine)/i,
  /^i('?m| am) (sorry|not able|unable)/i,
  /^i'?m not (fully sure|able)/i,
  /^i (was unable|cannot|can'?t) (verify|find|identify|confirm|determine)/i,
  /^based on the (information|search results|sources) (provided|available),?\s+i (couldn'?t|can'?t|was unable)/i,
  /\bno (matching )?search results\b/i,
  /\bsearch results (returned|are)\s+(none|empty)\b/i,
  /\bsource:\s*no (matching )?search results/i,
];

function isNullFinding(summary: string): boolean {
  const start = summary.slice(0, 400).trim();
  return NULL_RESULT_PATTERNS.some((p) => p.test(start));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract a Signal from a completed RunFinding and persist it.
 * Returns the Signal id on success, null if the finding has no entity (discovery
 * runs) or if the finding is a null/empty Perplexity response.
 *
 * Extraction failures are non-fatal: if Claude fails, a Signal is still persisted
 * using deterministic prefill values only. The RunFinding is never mutated or lost.
 */
export async function extractAndPersistSignal(
  ctx: SignalExtractionContext,
): Promise<string | null> {
  // Signal extraction only applies to entity-scoped (monitoring) runs.
  if (!ctx.run.entityId) return null;

  // Suppress null/failed Perplexity responses — they carry no real signal.
  if (isNullFinding(ctx.finding.summary)) {
    console.log(
      `[signal-extractor] null finding suppressed for finding ${ctx.finding.id} (entity: ${ctx.run.entityId})`,
    );
    return null;
  }

  const prefill = buildPrefill(ctx);
  const objective = ctx.template.objective;

  let extracted: ExtractionResult = {};

  try {
    extracted = await extractSemanticFields(ctx);
  } catch (err) {
    console.warn(
      `[signal-extractor] semantic extraction failed for finding ${ctx.finding.id} — persisting prefill-only signal:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  const payload = buildCreatePayload(prefill, extracted, objective);
  const signal = await prisma.signal.create({ data: payload });
  return signal.id;
}
