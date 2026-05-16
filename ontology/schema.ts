import { z } from 'zod';
import { ENTITY_TYPES, LAYERS, ROLES } from './types.js';

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

export const entityTypeSchema = z.enum(ENTITY_TYPES);

export const layerSchema = z.enum(LAYERS);

export const roleSchema = z.enum(ROLES);

export const priorityTierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

// Kebab-case alphanumeric ID: "ftc", "eu-ai-office", "openai-llc"
const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    'id must be lowercase kebab-case (letters, digits, hyphens; no leading/trailing hyphen)',
  );

const nonEmptyString = z.string().min(1).max(500);

// ---------------------------------------------------------------------------
// Entity schema
// ---------------------------------------------------------------------------

export const entitySchema = z.object({
  id: idSchema,

  name: z.string().min(1).max(200),

  entityType: entityTypeSchema,

  defaultLayer: layerSchema,

  jurisdictions: z
    .array(z.string().min(1).max(32))
    .min(1, 'at least one jurisdiction required'),

  sectors: z
    .array(z.string().min(1).max(64))
    .min(1, 'at least one sector required'),

  priorityTier: priorityTierSchema,

  active: z.boolean(),

  aliases: z.array(z.string().min(1).max(200)).optional(),

  description: z.string().min(1).max(1000).optional(),

  subtype: nonEmptyString.max(64).optional(),
});

export type ValidatedEntity = z.infer<typeof entitySchema>;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Throws ZodError with full path/message detail on invalid input. */
export function validateEntity(data: unknown): ValidatedEntity {
  return entitySchema.parse(data);
}

/** Returns { success, data, error } — never throws. */
export function safeValidateEntity(
  data: unknown,
): z.SafeParseReturnType<unknown, ValidatedEntity> {
  return entitySchema.safeParse(data);
}

/** Validate an array of entities; returns { valid[], invalid[{ index, error }] }. */
export function validateEntityBatch(items: unknown[]): {
  valid: ValidatedEntity[];
  invalid: Array<{ index: number; error: z.ZodError }>;
} {
  const valid: ValidatedEntity[] = [];
  const invalid: Array<{ index: number; error: z.ZodError }> = [];

  for (let i = 0; i < items.length; i++) {
    const result = entitySchema.safeParse(items[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({ index: i, error: result.error });
    }
  }

  return { valid, invalid };
}
