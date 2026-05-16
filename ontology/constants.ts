import type { EntityType, Layer, Role } from './types.js';

// ---------------------------------------------------------------------------
// Default layer by entity type
//
// These are editorial defaults — individual entities set their own defaultLayer.
// Use these when constructing new entity records without explicit layer guidance.
// ---------------------------------------------------------------------------

export const DEFAULT_LAYER_BY_TYPE: Record<EntityType, Layer> = {
  legislative_actor:                 'rule_setters',
  executive_body:                    'rule_setters',
  regulator:                         'rule_setters',
  court_tribunal:                    'rule_setters',
  subnational_government:            'rule_setters',
  international_public_body:         'rule_setters',
  frontier_developer:                'regulated_entities',
  ai_company:                        'regulated_entities',
  compute_infra_provider:            'regulated_entities',
  standards_or_evaluator:            'standards_agenda',
  research_policy_org:               'standards_agenda',
  civil_society_or_professional_group: 'standards_agenda',
  industry_or_investor_group:        'regulated_entities',
};

// ---------------------------------------------------------------------------
// Typical roles by entity type
//
// Many entities play multiple roles depending on context (e.g. a regulator
// is an enforcer AND a monitor). These are the most common roles, not
// an exhaustive list.
// ---------------------------------------------------------------------------

export const TYPICAL_ROLES_BY_TYPE: Record<EntityType, Role[]> = {
  legislative_actor:                 ['proposer'],
  executive_body:                    ['proposer', 'enforcer'],
  regulator:                         ['enforcer', 'monitor'],
  court_tribunal:                    ['enforcer'],
  subnational_government:            ['proposer', 'enforcer'],
  international_public_body:         ['proposer', 'monitor'],
  frontier_developer:                ['target'],
  ai_company:                        ['target'],
  compute_infra_provider:            ['target'],
  standards_or_evaluator:            ['monitor', 'proposer'],
  research_policy_org:               ['monitor', 'proposer'],
  civil_society_or_professional_group: ['monitor', 'proposer'],
  industry_or_investor_group:        ['target', 'proposer'],
};

// ---------------------------------------------------------------------------
// Well-known jurisdiction codes
// Extend as needed; these are the codes currently in scope for v1 coverage.
// ---------------------------------------------------------------------------

export const JURISDICTION = {
  GLOBAL: 'global',
  US:     'US',
  EU:     'EU',
  UK:     'GB',
  CN:     'CN',
  JP:     'JP',
  KR:     'KR',
  IN:     'IN',
  CA:     'CA',
  AU:     'AU',
  SG:     'SG',
  BR:     'BR',
  FR:     'FR',
  DE:     'DE',
} as const;

export type JurisdictionCode = (typeof JURISDICTION)[keyof typeof JURISDICTION];

// ---------------------------------------------------------------------------
// Well-known sector tags
// ---------------------------------------------------------------------------

export const SECTOR = {
  AI:        'ai',
  TECH:      'tech',
  FINANCE:   'finance',
  HEALTH:    'health',
  DEFENSE:   'defense',
  ENERGY:    'energy',
  TRANSPORT: 'transport',
  MEDIA:     'media',
  EDUCATION: 'education',
  LABOR:     'labor',
  PRIVACY:   'privacy',
} as const;

export type SectorTag = (typeof SECTOR)[keyof typeof SECTOR];
