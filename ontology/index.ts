export type { Entity, EntityType, Layer, Role, PriorityTier } from './types.js';
export { ENTITY_TYPES, LAYERS, ROLES } from './types.js';

export type { ValidatedEntity } from './schema.js';
export {
  entitySchema,
  entityTypeSchema,
  layerSchema,
  roleSchema,
  priorityTierSchema,
  validateEntity,
  safeValidateEntity,
  validateEntityBatch,
} from './schema.js';

export type { JurisdictionCode, SectorTag } from './constants.js';
export {
  DEFAULT_LAYER_BY_TYPE,
  TYPICAL_ROLES_BY_TYPE,
  JURISDICTION,
  SECTOR,
} from './constants.js';
