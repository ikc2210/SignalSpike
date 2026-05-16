import type { EntityType, Layer, Role } from './types.js';

// ---------------------------------------------------------------------------
// Default layer by entity type
//
// These are editorial defaults — individual entities set their own defaultLayer.
// Use these when constructing new entity records without explicit layer guidance.
// ---------------------------------------------------------------------------

export const DEFAULT_LAYER_BY_TYPE: Record<EntityType, Layer> = {
  national_legislature:       'rule_setters',
  executive_body:             'rule_setters',
  cross_cutting_regulator:    'rule_setters',
  sectoral_regulator:         'rule_setters',
  court_tribunal:             'rule_setters',
  international_organization: 'rule_setters',
  frontier_developer:         'regulated_entities',
  compute_infra_provider:     'regulated_entities',
  standards_body:             'standards_agenda',
  safety_institute:           'standards_agenda',
};

// ---------------------------------------------------------------------------
// Typical roles by entity type
//
// Many entities play multiple roles depending on context (e.g. a regulator
// is an enforcer AND a monitor). These are the most common roles, not
// an exhaustive list.
// ---------------------------------------------------------------------------

export const TYPICAL_ROLES_BY_TYPE: Record<EntityType, Role[]> = {
  national_legislature:       ['proposer'],
  executive_body:             ['proposer', 'enforcer'],
  cross_cutting_regulator:    ['enforcer', 'monitor'],
  sectoral_regulator:         ['enforcer', 'monitor'],
  court_tribunal:             ['enforcer'],
  international_organization: ['proposer', 'monitor'],
  frontier_developer:         ['target'],
  compute_infra_provider:     ['target'],
  standards_body:             ['proposer', 'monitor'],
  safety_institute:           ['monitor', 'proposer'],
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
