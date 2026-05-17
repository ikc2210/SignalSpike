import type { EntityType } from './types.js';
import type { QueryTemplateType, Objective } from './query.types.js';

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
// Signal Types — organized by family
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
// Stance — used by PositionSignal
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
// Priority Direction — used by PrioritySignal
// ---------------------------------------------------------------------------

export const PRIORITY_DIRECTIONS = ['rising', 'stable', 'falling'] as const;
export type PriorityDirection = (typeof PRIORITY_DIRECTIONS)[number];

// ---------------------------------------------------------------------------
// Entity-type-specific detail interfaces
// Discriminated by entityType. All fields optional — omit if not applicable.
// ---------------------------------------------------------------------------

export interface NationalLegislatureDetails {
  entityType: 'national_legislature';
  billNumber?: string;
  committee?: string;
  legislativeStage?: string;
}

export interface ExecutiveBodyDetails {
  entityType: 'executive_body';
  instrumentType?: string;
  issuingOffice?: string;
  implementationStatus?: string;
}

export interface CrossCuttingRegulatorDetails {
  entityType: 'cross_cutting_regulator';
  docketNumber?: string;
  enforcementType?: string;
  proceedingStage?: string;
}

export interface SectoralRegulatorDetails {
  entityType: 'sectoral_regulator';
  sector?: string;
  guidanceType?: string;
  approvalStatus?: string;
}

export interface CourtTribunalDetails {
  entityType: 'court_tribunal';
  caseName?: string;
  docketNumber?: string;
  proceduralPosture?: string;
}

export interface InternationalOrganizationDetails {
  entityType: 'international_organization';
  negotiationTrack?: string;
  instrumentStatus?: string;
  workingGroup?: string;
}

export interface FrontierDeveloperDetails {
  entityType: 'frontier_developer';
  modelName?: string;
  releaseType?: string;
  deploymentScope?: string;
}

export interface ComputeInfraProviderDetails {
  entityType: 'compute_infra_provider';
  productName?: string;
  infraType?: string;
  exportControlHook?: string;
}

export interface StandardsBodyDetails {
  entityType: 'standards_body';
  standardNumber?: string;
  draftStage?: string;
  commentWindow?: string;
}

export interface SafetyInstituteDetails {
  entityType: 'safety_institute';
  evaluationFramework?: string;
  benchmarkName?: string;
  partnerOrganizations?: string[];
}

export type EntityTypeDetails =
  | NationalLegislatureDetails
  | ExecutiveBodyDetails
  | CrossCuttingRegulatorDetails
  | SectoralRegulatorDetails
  | CourtTribunalDetails
  | InternationalOrganizationDetails
  | FrontierDeveloperDetails
  | ComputeInfraProviderDetails
  | StandardsBodyDetails
  | SafetyInstituteDetails;

// ---------------------------------------------------------------------------
// BaseSignal — fields shared by all Signal variants
// ---------------------------------------------------------------------------

export interface BaseSignal {
  id: string;
  runId: string;
  runFindingId: string;
  entityId: string;
  entityType: EntityType;
  queryTemplateId: string;
  templateType: QueryTemplateType;
  objective: Objective;
  signalType: SignalType | null;
  title: string;
  summary: string;
  sourceUrls: string[];
  sourceDomains: string[];
  topicTags: string[];
  jurisdictionTags: string[];
  /** ISO 8601 — when the underlying event was observed or reported */
  observedAt: string;
  /** ISO 8601 — when this Signal record was extracted from the RunFinding */
  extractedAt: string;
  /** Composite ranking score for UI sorting, 1–100 */
  importance: number;
  /** Extraction certainty, 1–100 */
  confidence: number;
  details?: EntityTypeDetails;
}

// ---------------------------------------------------------------------------
// ActivitySignal — what the entity did
// ---------------------------------------------------------------------------

export interface ActivitySignal extends BaseSignal {
  objective: 'activities';
  /** Short label for the type of change (e.g. "regulatory action", "product launch") */
  changeType: string;
  /** ISO 8601 date the event occurred, if determinable */
  eventDate?: string;
  /** Named parties mentioned as participants or targets */
  actorsMentioned: string[];
}

// ---------------------------------------------------------------------------
// PositionSignal — where the entity stands on a topic
// ---------------------------------------------------------------------------

export interface PositionSignal extends BaseSignal {
  objective: 'positions';
  /** The specific policy topic or concept (e.g. "frontier model thresholds") */
  topic: string;
  /** Short human-readable label for the position (e.g. "supports mandatory evals") */
  positionLabel: string;
  stance: Stance;
  /** How strongly held: 1 = weakly signaled, 5 = explicitly committed */
  strength: number;
  /** Direct quotes or close paraphrases from the source supporting the stance */
  evidenceSnippets: string[];
}

// ---------------------------------------------------------------------------
// PrioritySignal — what the entity appears to be prioritizing
// ---------------------------------------------------------------------------

export interface PrioritySignal extends BaseSignal {
  objective: 'priorities';
  /** Short label for the priority area (e.g. "AI safety evals") */
  priorityLabel: string;
  priorityDirection: PriorityDirection;
  /** Momentum of the priority shift: 1 = weak signal, 5 = strong/sustained pattern */
  momentum: number;
  /** Why this counts as a priority shift — evidence-based reasoning */
  rationale: string;
  /** IDs of other Signals that corroborate this priority assessment */
  supportingSignalIds: string[];
}

// ---------------------------------------------------------------------------
// Signal — discriminated union on objective
// ---------------------------------------------------------------------------

export type Signal = ActivitySignal | PositionSignal | PrioritySignal;
