// ---------------------------------------------------------------------------
// Entity Types
// A practical product taxonomy — not a theoretical ontology.
// Subtypes can be added without breaking this model.
// ---------------------------------------------------------------------------

export const ENTITY_TYPES = [
  'legislative_actor',         // Legislatures, parliaments, congressional committees
  'executive_body',            // Ministries, executive offices, departments, task forces
  'regulator',                 // Cross-cutting and sectoral regulators
  'court_tribunal',            // Courts, appellate bodies, arbitration panels
  'subnational_government',    // States, provinces, cities acting in policy capacity
  'international_public_body', // Foreign governments and international organizations
  'frontier_developer',        // Labs pushing the capability frontier (e.g. AGI-focused)
  'ai_company',                // AI product/service companies not on the frontier
  'compute_infra_provider',    // Cloud, chip, data-center providers
  'standards_or_evaluator',    // Standards bodies and safety/evaluation institutes
  'research_policy_org',       // Think tanks and academic research labs
  'civil_society_or_professional_group', // NGOs, advocacy groups, professional associations
  'industry_or_investor_group',          // Trade associations, coalitions, major investors
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
// Priority Tier — editorial prioritization for the dashboard
// 1 = highest priority (watch closely), 3 = lowest (background awareness)
// ---------------------------------------------------------------------------

export type PriorityTier = 1 | 2 | 3;

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

  /** Editorial priority for this dashboard: 1 = highest, 3 = background */
  priorityTier: PriorityTier;

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
