import type { EntityType } from './types.js';

// ---------------------------------------------------------------------------
// Objective — what the query is designed to surface
// ---------------------------------------------------------------------------

export const OBJECTIVES = [
  'positions',   // What stance does the entity take on a topic?
  'priorities',  // What does the entity appear to prioritize?
  'activities',  // What has the entity been doing?
] as const;

export type Objective = (typeof OBJECTIVES)[number];

// ---------------------------------------------------------------------------
// Cadence — how often the query should run
// ---------------------------------------------------------------------------

export const CADENCES = [
  'daily',
  'weekly',
  'monthly',
  'ad_hoc',
] as const;

export type Cadence = (typeof CADENCES)[number];

// ---------------------------------------------------------------------------
// QueryTemplate — a reusable, parameterized query definition
//
// Templates are entity-type-specific and objective-driven.
// domainAllowlist is optional and per-template: some templates for the same
// entity type use it for precision; others omit it for broader discovery.
// ---------------------------------------------------------------------------

export interface QueryTemplate {
  /** Stable kebab-case identifier */
  id: string;

  name: string;

  /** Entity types this template applies to; at least one required */
  entityTypes: [EntityType, ...EntityType[]];

  /** Pin to specific entity IDs; if omitted, applies to all entities of entityTypes */
  targetEntityIds?: string[];

  /** What the query is designed to surface */
  objective: Objective;

  /** Topics the query is scoped to; if omitted, the query is topic-agnostic */
  topics?: string[];

  /**
   * The query string or pattern. May use placeholders (e.g. {entity}, {topic})
   * resolved at run time.
   */
  queryPattern: string;

  cadence: Cadence;

  /**
   * Optional list of domains to restrict results to (e.g. ["ftc.gov", "federalregister.gov"]).
   * Per-template — not a property of the entity type. Omit for broader discovery.
   */
  domainAllowlist?: string[];

  active: boolean;
}
