import type { Layer, Role } from './types.js';

// ---------------------------------------------------------------------------
// Signal Families — grouping dimension for display and filtering
// ---------------------------------------------------------------------------

export const SIGNAL_FAMILIES = [
  'publication',
  'process',
  'participation',
  'disclosure',
  'personnel',
  'operational',
] as const;

export type SignalFamily = (typeof SIGNAL_FAMILIES)[number];

// ---------------------------------------------------------------------------
// Signal Types — organized by family; exported individually for filtering
// ---------------------------------------------------------------------------

export const PUBLICATION_SIGNAL_TYPES = [
  'strategy_published',
  'guidance_issued',
  'standard_published',
  'benchmark_released',
  'company_policy_updated',
  'report_published',
  'transparency_report_published',
] as const;

export const PROCESS_SIGNAL_TYPES = [
  'bill_introduced',
  'bill_advanced',
  'bill_enacted',
  'executive_action_issued',
  'rule_proposed',
  'rule_finalized',
  'consultation_opened',
  'consultation_closed',
  'hearing_scheduled',
  'hearing_held',
  'court_decision_issued',
] as const;

export const PARTICIPATION_SIGNAL_TYPES = [
  'testimony_submitted',
  'witness_testified',
  'comment_letter_submitted',
  'coalition_letter_signed',
  'advisory_member_appointed',
] as const;

export const DISCLOSURE_SIGNAL_TYPES = [
  'lobbying_filing_submitted',
  'contributions_report_filed',
  'incident_disclosed',
] as const;

export const PERSONNEL_SIGNAL_TYPES = [
  'hire',
  'departure',
  'promotion',
  'board_appointment',
  'revolving_door_move',
  'team_created',
  'team_reorganized',
] as const;

export const OPERATIONAL_SIGNAL_TYPES = [
  'capability_released',
  'model_release_decision',
  'deployment_restriction_changed',
  'access_policy_changed',
  'terms_changed',
  'jurisdiction_launch',
  'jurisdiction_withdrawal',
  'government_contract_accepted',
  'government_contract_declined',
  'compliance_program_changed',
] as const;

export const SIGNAL_TYPES = [
  ...PUBLICATION_SIGNAL_TYPES,
  ...PROCESS_SIGNAL_TYPES,
  ...PARTICIPATION_SIGNAL_TYPES,
  ...DISCLOSURE_SIGNAL_TYPES,
  ...PERSONNEL_SIGNAL_TYPES,
  ...OPERATIONAL_SIGNAL_TYPES,
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

// Lookup: SignalType → SignalFamily (useful for grouping queries)
export const SIGNAL_TYPE_FAMILY: Record<SignalType, SignalFamily> = {
  strategy_published:               'publication',
  guidance_issued:                  'publication',
  standard_published:               'publication',
  benchmark_released:               'publication',
  company_policy_updated:           'publication',
  report_published:                 'publication',
  transparency_report_published:    'publication',

  bill_introduced:                  'process',
  bill_advanced:                    'process',
  bill_enacted:                     'process',
  executive_action_issued:          'process',
  rule_proposed:                    'process',
  rule_finalized:                   'process',
  consultation_opened:              'process',
  consultation_closed:              'process',
  hearing_scheduled:                'process',
  hearing_held:                     'process',
  court_decision_issued:            'process',

  testimony_submitted:              'participation',
  witness_testified:                'participation',
  comment_letter_submitted:         'participation',
  coalition_letter_signed:          'participation',
  advisory_member_appointed:        'participation',

  lobbying_filing_submitted:        'disclosure',
  contributions_report_filed:       'disclosure',
  incident_disclosed:               'disclosure',

  hire:                             'personnel',
  departure:                        'personnel',
  promotion:                        'personnel',
  board_appointment:                'personnel',
  revolving_door_move:              'personnel',
  team_created:                     'personnel',
  team_reorganized:                 'personnel',

  capability_released:              'operational',
  model_release_decision:           'operational',
  deployment_restriction_changed:   'operational',
  access_policy_changed:            'operational',
  terms_changed:                    'operational',
  jurisdiction_launch:              'operational',
  jurisdiction_withdrawal:          'operational',
  government_contract_accepted:     'operational',
  government_contract_declined:     'operational',
  compliance_program_changed:       'operational',
};

// ---------------------------------------------------------------------------
// Stance — for SignalPosition
// ---------------------------------------------------------------------------

export const STANCES = [
  'support',
  'oppose',
  'mixed',
  'unclear',
  'monitoring',
] as const;

export type Stance = (typeof STANCES)[number];

// ---------------------------------------------------------------------------
// Legal Status
// ---------------------------------------------------------------------------

export const LEGAL_STATUSES = [
  'draft',
  'proposed',
  'final',
  'effective',
  'litigation',
  'voluntary',
] as const;

export type LegalStatus = (typeof LEGAL_STATUSES)[number];

// ---------------------------------------------------------------------------
// Effort Level
// Coarse proxy for commitment; prevents heavy filings from equating minor updates.
// 1 = lightweight update → 5 = very high-effort / high-commitment action
// ---------------------------------------------------------------------------

export type EffortLevel = 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Priority Evidence Types
// ---------------------------------------------------------------------------

export const PRIORITY_EVIDENCE_TYPES = [
  'staffing',
  'spending',
  'hiring_focus',
  'org_structure',
  'training_investment',
  'procurement_capacity',
  'lobbying_spend',
  'external_advisory_capacity',
] as const;

export type PriorityEvidenceType = (typeof PRIORITY_EVIDENCE_TYPES)[number];

// ---------------------------------------------------------------------------
// SignalPosition — an entity's stance on a topic, extracted from a signal
//
// Exists so positional data is explicit and queryable, rather than buried in
// signal summaries. Enables: "What does entity X say about topic Y?"
// ---------------------------------------------------------------------------

export interface SignalPosition {
  /** Policy topic or concept this position is about (e.g. "frontier model thresholds") */
  topic: string;

  stance: Stance;

  /**
   * explicit = the source directly states the entity's position
   * implicit = the position is inferred from operational behavior or other actions
   */
  evidence: 'explicit' | 'implicit';

  quoteOrParaphrase?: string;
}

// ---------------------------------------------------------------------------
// Signal — the atomic unit of policy activity
// ---------------------------------------------------------------------------

export interface Signal {
  /** Stable kebab-case identifier */
  id: string;

  title: string;

  summary: string;

  signalType: SignalType;

  /** ISO 8601 date the signal was observed or collected */
  dateObserved: string;

  /** ISO 8601 date the underlying event occurred, if different from dateObserved */
  eventDate?: string;

  /** ISO 8601 date the action becomes or became legally effective */
  effectiveDate?: string;

  /** ISO 3166 code, regional code ("EU"), or "global" */
  jurisdiction: string;

  sectors: [string, ...string[]];

  topics: [string, ...string[]];

  layers: [Layer, ...Layer[]];

  roles: [Role, ...Role[]];

  /** Citation/source record IDs; at least one required */
  sourceIds: [string, ...string[]];

  /** The single entity most responsible for or most affected by this signal */
  primaryEntityId: string;

  /** Additional entities involved; use SignalActor for richer role/layer data */
  relatedEntityIds: string[];

  legalStatus?: LegalStatus;

  /** Editorial importance of this signal, 0.0–1.0 */
  importanceScore: number;

  /**
   * Coarse proxy for the commitment or effort behind this signal.
   * Prevents a lobbying disclosure from being treated the same as a press release.
   * 1 = lightweight update  2 = normal  3 = substantive artifact or action
   * 4 = major filing / policy / deployment action  5 = very high-commitment action
   */
  effortLevel: EffortLevel;

  /** Source reliability and signal clarity, 0.0–1.0 */
  confidenceScore: number;

  /**
   * Deterministic key for deduplication.
   * Recommended composition: hash(signalType + primaryEntityId + eventDate + jurisdiction)
   */
  dedupeKey: string;

  /** Structured position statements extracted from this signal */
  positions?: SignalPosition[];
}

// ---------------------------------------------------------------------------
// SignalActor — joins entities to signals with explicit role + layer context
//
// Required because one signal may involve multiple entities playing different
// roles. The primary/relatedEntityIds on Signal are a lightweight reference;
// SignalActor is the full relational record.
// ---------------------------------------------------------------------------

export interface SignalActor {
  signalId: string;

  entityId: string;

  role: Role;

  layer: Layer;

  /** Optional 1–5 weight indicating this actor's relative centrality in the signal */
  actorWeight?: number;
}

// ---------------------------------------------------------------------------
// PriorityEvidence — structural indicators of what an entity actually prioritizes
//
// NOT a Signal. Exists because "priorities" must not collapse into signal
// frequency alone. Staffing levels, budget allocations, org structure, and
// lobbying spend reveal priorities independent of any discrete event.
//
// Enables: "What does this entity seem to prioritize?" without over-counting
// entities that generate high signal volume on a topic.
// ---------------------------------------------------------------------------

export interface PriorityEvidence {
  id: string;

  entityId: string;

  /** Policy topic this evidence pertains to, if specific */
  topic?: string;

  type: PriorityEvidenceType;

  summary: string;

  /** Human-readable value: "$4.2M", "12 FTEs", "↑ 40% YoY" */
  valueText?: string;

  direction?: 'increase' | 'decrease' | 'stable' | 'new';

  /** ISO 8601 date this was observed or reported */
  dateObserved: string;

  sourceIds: [string, ...string[]];

  /** Source reliability and data clarity, 0.0–1.0 */
  confidenceScore: number;
}
