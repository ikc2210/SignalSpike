// ---------------------------------------------------------------------------
// Entity ontology
// ---------------------------------------------------------------------------

export type { Entity, EntityType, Layer, Role } from './types.js';
export { ENTITY_TYPES, LAYERS, ROLES } from './types.js';

export type { ValidatedEntity } from './schema.js';
export {
  entitySchema,
  entityTypeSchema,
  layerSchema,
  roleSchema,
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

// ---------------------------------------------------------------------------
// Signal ontology
// ---------------------------------------------------------------------------

export type {
  SignalType,
  SignalFamily,
  Stance,
  LegalStatus,
  EffortLevel,
  PriorityEvidenceType,
  SignalPosition,
  Signal,
  SignalActor,
  PriorityEvidence,
} from './signal.types.js';

export {
  SIGNAL_TYPES,
  SIGNAL_FAMILIES,
  SIGNAL_TYPE_FAMILY,
  PUBLICATION_SIGNAL_TYPES,
  PROCESS_SIGNAL_TYPES,
  PARTICIPATION_SIGNAL_TYPES,
  DISCLOSURE_SIGNAL_TYPES,
  PERSONNEL_SIGNAL_TYPES,
  OPERATIONAL_SIGNAL_TYPES,
  STANCES,
  LEGAL_STATUSES,
  PRIORITY_EVIDENCE_TYPES,
} from './signal.types.js';

export type {
  ValidatedSignal,
  ValidatedSignalPosition,
  ValidatedSignalActor,
  ValidatedPriorityEvidence,
} from './signal.schema.js';

export {
  signalSchema,
  signalPositionSchema,
  signalActorSchema,
  priorityEvidenceSchema,
  signalTypeSchema,
  stanceSchema,
  legalStatusSchema,
  priorityEvidenceTypeSchema,
  effortLevelSchema,
  actorWeightSchema,
  validateSignal,
  safeValidateSignal,
  validateSignalBatch,
  validatePriorityEvidence,
  safeValidatePriorityEvidence,
  validatePriorityEvidenceBatch,
} from './signal.schema.js';
