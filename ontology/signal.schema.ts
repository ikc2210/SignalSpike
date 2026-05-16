import { z } from 'zod';
import { layerSchema, roleSchema } from './schema.js';
import {
  SIGNAL_TYPES,
  STANCES,
  LEGAL_STATUSES,
  PRIORITY_EVIDENCE_TYPES,
} from './signal.types.js';

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

export const signalTypeSchema = z.enum(SIGNAL_TYPES);

export const stanceSchema = z.enum(STANCES);

export const legalStatusSchema = z.enum(LEGAL_STATUSES);

export const priorityEvidenceTypeSchema = z.enum(PRIORITY_EVIDENCE_TYPES);

export const effortLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const actorWeightSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

// Accepts YYYY-MM-DD and full ISO 8601 datetimes
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, 'must start with YYYY-MM-DD');

const scoreSchema = z
  .number()
  .min(0, 'score must be ≥ 0')
  .max(1, 'score must be ≤ 1');

const idSchema = z.string().min(1).max(128);

// ---------------------------------------------------------------------------
// SignalPosition schema
// ---------------------------------------------------------------------------

export const signalPositionSchema = z.object({
  topic: z.string().min(1).max(200),
  stance: stanceSchema,
  evidence: z.enum(['explicit', 'implicit']),
  quoteOrParaphrase: z.string().min(1).max(2000).optional(),
});

export type ValidatedSignalPosition = z.infer<typeof signalPositionSchema>;

// ---------------------------------------------------------------------------
// Signal schema
// ---------------------------------------------------------------------------

export const signalSchema = z.object({
  id: idSchema,

  title: z.string().min(1).max(300),

  summary: z.string().min(1).max(2000),

  signalType: signalTypeSchema,

  dateObserved: isoDateSchema,

  eventDate: isoDateSchema.optional(),

  effectiveDate: isoDateSchema.optional(),

  jurisdiction: z.string().min(1).max(32),

  sectors: z
    .array(z.string().min(1).max(64))
    .min(1, 'at least one sector required'),

  topics: z
    .array(z.string().min(1).max(200))
    .min(1, 'at least one topic required'),

  layers: z
    .array(layerSchema)
    .min(1, 'at least one layer required'),

  roles: z
    .array(roleSchema)
    .min(1, 'at least one role required'),

  sourceIds: z
    .array(z.string().min(1))
    .min(1, 'at least one source required'),

  primaryEntityId: z.string().min(1),

  relatedEntityIds: z.array(z.string().min(1)),

  legalStatus: legalStatusSchema.optional(),

  importanceScore: scoreSchema,

  effortLevel: effortLevelSchema,

  confidenceScore: scoreSchema,

  dedupeKey: z.string().min(1).max(256),

  positions: z.array(signalPositionSchema).optional(),
});

export type ValidatedSignal = z.infer<typeof signalSchema>;

// ---------------------------------------------------------------------------
// SignalActor schema
// ---------------------------------------------------------------------------

export const signalActorSchema = z.object({
  signalId: z.string().min(1),
  entityId: z.string().min(1),
  role: roleSchema,
  layer: layerSchema,
  actorWeight: actorWeightSchema.optional(),
});

export type ValidatedSignalActor = z.infer<typeof signalActorSchema>;

// ---------------------------------------------------------------------------
// PriorityEvidence schema
// ---------------------------------------------------------------------------

export const priorityEvidenceSchema = z.object({
  id: idSchema,

  entityId: z.string().min(1),

  topic: z.string().min(1).max(200).optional(),

  type: priorityEvidenceTypeSchema,

  summary: z.string().min(1).max(2000),

  valueText: z.string().min(1).max(200).optional(),

  direction: z.enum(['increase', 'decrease', 'stable', 'new']).optional(),

  dateObserved: isoDateSchema,

  sourceIds: z
    .array(z.string().min(1))
    .min(1, 'at least one source required'),

  confidenceScore: scoreSchema,
});

export type ValidatedPriorityEvidence = z.infer<typeof priorityEvidenceSchema>;

// ---------------------------------------------------------------------------
// Signal validation helpers
// ---------------------------------------------------------------------------

/** Throws ZodError with full path/message detail on invalid input. */
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

// ---------------------------------------------------------------------------
// PriorityEvidence validation helpers
// ---------------------------------------------------------------------------

/** Throws ZodError with full path/message detail on invalid input. */
export function validatePriorityEvidence(data: unknown): ValidatedPriorityEvidence {
  return priorityEvidenceSchema.parse(data);
}

/** Returns { success, data, error } — never throws. */
export function safeValidatePriorityEvidence(
  data: unknown,
): z.SafeParseReturnType<unknown, ValidatedPriorityEvidence> {
  return priorityEvidenceSchema.safeParse(data);
}

/** Validate an array of evidence records; returns { valid[], invalid[{ index, error }] }. */
export function validatePriorityEvidenceBatch(items: unknown[]): {
  valid: ValidatedPriorityEvidence[];
  invalid: Array<{ index: number; error: z.ZodError }>;
} {
  const valid: ValidatedPriorityEvidence[] = [];
  const invalid: Array<{ index: number; error: z.ZodError }> = [];

  for (let i = 0; i < items.length; i++) {
    const result = priorityEvidenceSchema.safeParse(items[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({ index: i, error: result.error });
    }
  }

  return { valid, invalid };
}
