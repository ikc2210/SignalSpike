// ---------------------------------------------------------------------------
// Entity Types
// A practical product taxonomy — not a theoretical ontology.
// Subtypes can be added without breaking this model.
// ---------------------------------------------------------------------------

export const ENTITY_TYPES = [
  'national_legislature',       // Legislatures, parliaments, congressional committees
  'executive_body',             // Ministries, executive offices, departments, task forces
  'cross_cutting_regulator',    // Horizontal regulators with authority across sectors (FTC, ICO)
  'sectoral_regulator',         // Regulators with authority in a specific sector (OCC, FCA, FAA)
  'court_tribunal',             // Courts, appellate bodies, arbitration panels
  'international_organization', // Multilateral bodies and foreign governments
  'frontier_developer',         // Labs pushing the capability frontier (e.g. AGI-focused)
  'compute_infra_provider',     // Cloud hyperscalers, chip designers, data-center operators
  'standards_body',             // Formal standards organizations (ISO, IEEE, NIST)
  'safety_institute',           // AI safety and evaluation institutes (METR, UK AISI)
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// ---------------------------------------------------------------------------
// Layers — orthogonal to entity type
// ---------------------------------------------------------------------------

export const LAYERS = [
  'rule_setters',       // Those who create or set binding rules
  'regulated_entities', // Primary targets of regulation
  'implementers',       // Those who carry out or enforce rules
  'standards_agenda',   // Those who shape norms, standards, and discourse
] as const;

export type Layer = (typeof LAYERS)[number];

// ---------------------------------------------------------------------------
// Roles — orthogonal to entity type; context-specific
// ---------------------------------------------------------------------------

export const ROLES = [
  'proposer',  // Initiates legislation, regulation, or standards
  'target',    // Subject of regulation or enforcement action
  'enforcer',  // Applies or enforces rules
  'monitor',   // Observes, audits, or reports on compliance and risk
] as const;

export type Role = (typeof ROLES)[number];

// ---------------------------------------------------------------------------
// Core Entity interface
// ---------------------------------------------------------------------------

export interface Entity {
  /** Stable kebab-case identifier: "ftc", "eu-ai-office", "openai" */
  id: string;

  /** Full canonical name */
  name: string;

  entityType: EntityType;

  /** The layer this entity most commonly occupies across contexts */
  defaultLayer: Layer;

  /**
   * ISO 3166-1 alpha-2 codes, regional codes (e.g. "EU"), or "global".
   * At least one required.
   */
  jurisdictions: [string, ...string[]];

  /**
   * Policy/industry sectors in scope (e.g. "ai", "finance", "health", "defense").
   * At least one required.
   */
  sectors: [string, ...string[]];

  /** False when entity is dissolved, merged, or no longer policy-active */
  active: boolean;

  /** Alternative names, acronyms, or former names */
  aliases?: string[];

  /** Short prose description (1–3 sentences) */
  description?: string;

  /**
   * Optional finer-grained classification within the entity type.
   * Free-form in v1; structured subtypes can be added later.
   * Examples: "independent-agency", "trade-association", "safety-institute"
   */
  subtype?: string;
}
