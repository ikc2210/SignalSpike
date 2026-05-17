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
  STARTER_PRIMARY_DOMAINS_BY_ENTITY_TYPE,
  JURISDICTION,
  SECTOR,
} from './constants.js';

// ---------------------------------------------------------------------------
// Query ontology
// ---------------------------------------------------------------------------

export type { QueryTemplateType, Objective, Cadence, QueryTemplate } from './query.types.js';
export { QUERY_TEMPLATE_TYPES, OBJECTIVES, CADENCES } from './query.types.js';

export type { ValidatedQueryTemplate } from './query.schema.js';
export {
  queryTemplateSchema,
  queryTemplateTypeSchema,
  objectiveSchema,
  cadenceSchema,
  validateQueryTemplate,
  safeValidateQueryTemplate,
  validateQueryTemplateBatch,
} from './query.schema.js';

// ---------------------------------------------------------------------------
// Signal ontology
// ---------------------------------------------------------------------------

export type {
  SignalType,
  SignalFamily,
  Stance,
  PriorityDirection,
  // Entity-type detail interfaces
  NationalLegislatureDetails,
  ExecutiveBodyDetails,
  CrossCuttingRegulatorDetails,
  SectoralRegulatorDetails,
  CourtTribunalDetails,
  InternationalOrganizationDetails,
  FrontierDeveloperDetails,
  ComputeInfraProviderDetails,
  StandardsBodyDetails,
  SafetyInstituteDetails,
  EntityTypeDetails,
  // Signal interfaces
  BaseSignal,
  ActivitySignal,
  PositionSignal,
  PrioritySignal,
  Signal,
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
  PRIORITY_DIRECTIONS,
} from './signal.types.js';

export type {
  ValidatedSignal,
  ValidatedActivitySignal,
  ValidatedPositionSignal,
  ValidatedPrioritySignal,
  ValidatedEntityTypeDetails,
} from './signal.schema.js';

export {
  signalSchema,
  activitySignalSchema,
  positionSignalSchema,
  prioritySignalSchema,
  entityTypeDetailsSchema,
  signalTypeSchema,
  stanceSchema,
  priorityDirectionSchema,
  validateSignal,
  safeValidateSignal,
  validateSignalBatch,
} from './signal.schema.js';
