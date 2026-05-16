import { z } from 'zod';
import { entityTypeSchema } from './schema.js';
import { OBJECTIVES, CADENCES } from './query.types.js';

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

export const objectiveSchema = z.enum(OBJECTIVES);

export const cadenceSchema = z.enum(CADENCES);

const idSchema = z.string().min(1).max(128);

// ---------------------------------------------------------------------------
// QueryTemplate schema
// ---------------------------------------------------------------------------

export const queryTemplateSchema = z.object({
  id: idSchema,

  name: z.string().min(1).max(200),

  entityTypes: z
    .array(entityTypeSchema)
    .min(1, 'at least one entity type required'),

  targetEntityIds: z.array(z.string().min(1)).optional(),

  objective: objectiveSchema,

  topics: z.array(z.string().min(1).max(200)).optional(),

  queryPattern: z.string().min(1).max(1000),

  cadence: cadenceSchema,

  domainAllowlist: z.array(z.string().min(1).max(253)).optional(),

  active: z.boolean(),
});

export type ValidatedQueryTemplate = z.infer<typeof queryTemplateSchema>;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Throws ZodError with full path/message detail on invalid input. */
export function validateQueryTemplate(data: unknown): ValidatedQueryTemplate {
  return queryTemplateSchema.parse(data);
}

/** Returns { success, data, error } — never throws. */
export function safeValidateQueryTemplate(
  data: unknown,
): z.SafeParseReturnType<unknown, ValidatedQueryTemplate> {
  return queryTemplateSchema.safeParse(data);
}

/** Validate an array of templates; returns { valid[], invalid[{ index, error }] }. */
export function validateQueryTemplateBatch(items: unknown[]): {
  valid: ValidatedQueryTemplate[];
  invalid: Array<{ index: number; error: z.ZodError }>;
} {
  const valid: ValidatedQueryTemplate[] = [];
  const invalid: Array<{ index: number; error: z.ZodError }> = [];

  for (let i = 0; i < items.length; i++) {
    const result = queryTemplateSchema.safeParse(items[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({ index: i, error: result.error });
    }
  }

  return { valid, invalid };
}
