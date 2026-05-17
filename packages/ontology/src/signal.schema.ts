import { z } from 'zod';
import { entityTypeSchema } from './schema.js';
import { queryTemplateTypeSchema } from './query.schema.js';
import {
  SIGNAL_TYPES,
  STANCES,
  PRIORITY_DIRECTIONS,
} from './signal.types.js';

// ---------------------------------------------------------------------------
// Primitive schemas — reusable across signal variants
// ---------------------------------------------------------------------------

export const signalTypeSchema = z.enum(SIGNAL_TYPES);

export const stanceSchema = z.enum(STANCES);

export const priorityDirectionSchema = z.enum(PRIORITY_DIRECTIONS);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'must start with YYYY-MM-DD');

const score100Schema = z.number().int().min(1).max(100);

const score5Schema = z.number().int().min(1).max(5);

// ---------------------------------------------------------------------------
// Entity-type-specific detail schemas
// Each discriminates on entityType; all domain fields are optional.
// ---------------------------------------------------------------------------

export const nationalLegislatureDetailsSchema = z.object({
  entityType: z.literal('national_legislature'),
  billNumber: z.string().max(50).optional(),
  committee: z.string().max(200).optional(),
  legislativeStage: z.string().max(100).optional(),
});

export const executiveBodyDetailsSchema = z.object({
  entityType: z.literal('executive_body'),
  instrumentType: z.string().max(100).optional(),
  issuingOffice: z.string().max(200).optional(),
  implementationStatus: z.string().max(100).optional(),
});

export const crossCuttingRegulatorDetailsSchema = z.object({
  entityType: z.literal('cross_cutting_regulator'),
  docketNumber: z.string().max(100).optional(),
  enforcementType: z.string().max(100).optional(),
  proceedingStage: z.string().max(100).optional(),
});

export const sectoralRegulatorDetailsSchema = z.object({
  entityType: z.literal('sectoral_regulator'),
  sector: z.string().max(100).optional(),
  guidanceType: z.string().max(100).optional(),
  approvalStatus: z.string().max(100).optional(),
});

export const courtTribunalDetailsSchema = z.object({
  entityType: z.literal('court_tribunal'),
  caseName: z.string().max(300).optional(),
  docketNumber: z.string().max(100).optional(),
  proceduralPosture: z.string().max(100).optional(),
});

export const internationalOrganizationDetailsSchema = z.object({
  entityType: z.literal('international_organization'),
  negotiationTrack: z.string().max(200).optional(),
  instrumentStatus: z.string().max(100).optional(),
  workingGroup: z.string().max(200).optional(),
});

export const frontierDeveloperDetailsSchema = z.object({
  entityType: z.literal('frontier_developer'),
  modelName: z.string().max(100).optional(),
  releaseType: z.string().max(100).optional(),
  deploymentScope: z.string().max(200).optional(),
});

export const computeInfraProviderDetailsSchema = z.object({
  entityType: z.literal('compute_infra_provider'),
  productName: z.string().max(100).optional(),
  infraType: z.string().max(100).optional(),
  exportControlHook: z.string().max(200).optional(),
});

export const standardsBodyDetailsSchema = z.object({
  entityType: z.literal('standards_body'),
  standardNumber: z.string().max(50).optional(),
  draftStage: z.string().max(100).optional(),
  commentWindow: z.string().max(100).optional(),
});

export const safetyInstituteDetailsSchema = z.object({
  entityType: z.literal('safety_institute'),
  evaluationFramework: z.string().max(200).optional(),
  benchmarkName: z.string().max(200).optional(),
  partnerOrganizations: z.array(z.string().max(200)).optional(),
});

export const entityTypeDetailsSchema = z.discriminatedUnion('entityType', [
  nationalLegislatureDetailsSchema,
  executiveBodyDetailsSchema,
  crossCuttingRegulatorDetailsSchema,
  sectoralRegulatorDetailsSchema,
  courtTribunalDetailsSchema,
  internationalOrganizationDetailsSchema,
  frontierDeveloperDetailsSchema,
  computeInfraProviderDetailsSchema,
  standardsBodyDetailsSchema,
  safetyInstituteDetailsSchema,
]);

export type ValidatedEntityTypeDetails = z.infer<typeof entityTypeDetailsSchema>;

// ---------------------------------------------------------------------------
// Base signal fields — shared across all objective variants
// ---------------------------------------------------------------------------

const baseSignalFields = {
  id: z.string().min(1).max(128),
  runId: z.string().min(1),
  runFindingId: z.string().min(1),
  entityId: z.string().min(1),
  entityType: entityTypeSchema,
  queryTemplateId: z.string().min(1),
  templateType: queryTemplateTypeSchema,
  signalType: signalTypeSchema.nullable(),
  title: z.string().min(1).max(300),
  summary: z.string().min(1).max(2000),
  sourceUrls: z.array(z.string().url()),
  sourceDomains: z.array(z.string()),
  topicTags: z.array(z.string().min(1).max(200)),
  jurisdictionTags: z.array(z.string().min(1).max(32)),
  observedAt: isoDateSchema,
  extractedAt: isoDateSchema,
  importance: score100Schema,
  confidence: score100Schema,
  details: entityTypeDetailsSchema.optional(),
};

// ---------------------------------------------------------------------------
// Objective-specific schemas
// ---------------------------------------------------------------------------

export const activitySignalSchema = z.object({
  ...baseSignalFields,
  objective: z.literal('activities'),
  changeType: z.string().min(1).max(200),
  eventDate: isoDateSchema.optional(),
  actorsMentioned: z.array(z.string().min(1).max(200)),
});

export const positionSignalSchema = z.object({
  ...baseSignalFields,
  objective: z.literal('positions'),
  topic: z.string().min(1).max(300),
  positionLabel: z.string().min(1).max(300),
  stance: stanceSchema,
  strength: score5Schema,
  evidenceSnippets: z.array(z.string().min(1).max(1000)),
});

export const prioritySignalSchema = z.object({
  ...baseSignalFields,
  objective: z.literal('priorities'),
  priorityLabel: z.string().min(1).max(300),
  priorityDirection: priorityDirectionSchema,
  momentum: score5Schema,
  rationale: z.string().min(1).max(2000),
  supportingSignalIds: z.array(z.string().min(1)),
});

// ---------------------------------------------------------------------------
// Signal — discriminated union on objective
// ---------------------------------------------------------------------------

export const signalSchema = z.discriminatedUnion('objective', [
  activitySignalSchema,
  positionSignalSchema,
  prioritySignalSchema,
]);

export type ValidatedActivitySignal = z.infer<typeof activitySignalSchema>;
export type ValidatedPositionSignal = z.infer<typeof positionSignalSchema>;
export type ValidatedPrioritySignal = z.infer<typeof prioritySignalSchema>;
export type ValidatedSignal = z.infer<typeof signalSchema>;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Throws ZodError on invalid input. */
export function validateSignal(data: unknown): ValidatedSignal {
  return signalSchema.parse(data);
}

/** Returns { success, data, error } — never throws. */
export function safeValidateSignal(
  data: unknown,
): z.SafeParseReturnType<unknown, ValidatedSignal> {
  return signalSchema.safeParse(data);
}

/** Validate an array of signals; returns { valid[], invalid[{ index, error }] }. */
export function validateSignalBatch(items: unknown[]): {
  valid: ValidatedSignal[];
  invalid: Array<{ index: number; error: z.ZodError }>;
} {
  const valid: ValidatedSignal[] = [];
  const invalid: Array<{ index: number; error: z.ZodError }> = [];

  for (let i = 0; i < items.length; i++) {
    const result = signalSchema.safeParse(items[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({ index: i, error: result.error });
    }
  }

  return { valid, invalid };
}
