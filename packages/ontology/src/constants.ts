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
// Starter primary domains by entity type
//
// Reference list for QueryTemplate.domainAllowlist. These are suggestions,
// not enforced defaults — each template may use any subset, the full list,
// or omit domainAllowlist entirely for open-domain queries.
//
// For frontier_developer and compute_infra_provider, prefer these domains
// only on official-doc / position queries. Activity, personnel, lobbying,
// and contract queries should generally remain open-domain.
// ---------------------------------------------------------------------------

export const STARTER_PRIMARY_DOMAINS_BY_ENTITY_TYPE: Record<EntityType, readonly string[]> = {
  national_legislature: [
    'congress.gov',
    'house.gov',
    'senate.gov',
    'govinfo.gov',
  ],

  executive_body: [
    'whitehouse.gov',
    'federalregister.gov',
    'omb.gov',
    'state.gov',
  ],

  cross_cutting_regulator: [
    'federalregister.gov',
    'regulations.gov',
    'ftc.gov',
    'sec.gov',
    'bis.doc.gov',
  ],

  sectoral_regulator: [
    'federalregister.gov',
    'regulations.gov',
    'fda.gov',
    'occ.gov',
    'fdic.gov',
    'dot.gov',
  ],

  court_tribunal: [
    'supremecourt.gov',
    'uscourts.gov', // PACER + federal judiciary umbrella; add specific circuit/district/state court domains as needed
  ],

  international_organization: [
    'coe.int',
    'un.org',
    'oecd.org',
    'oecd.ai',
    'europa.eu',
    // add specialized .int sites per IO as needed (e.g. 'itu.int', 'unesco.org')
  ],

  frontier_developer: [
    'openai.com',
    'anthropic.com',
    'deepmind.google',
    'meta.ai',
    'palantir.com',
  ],

  compute_infra_provider: [
    'aws.amazon.com',
    'azure.microsoft.com',
    'cloud.google.com',
    'nvidia.com',
    'bis.doc.gov',
    'sam.gov',
  ],

  standards_body: [
    'iso.org',
    'iec.ch',
    'ieee.org',
    'etsi.org',
    'oasis-open.org',
    'standardscoordinatingbody.org',
    'first.org',
    'nist.gov',
  ],

  safety_institute: [
    'nist.gov',
    // left intentionally sparse; add national AI safety institute domains as they stabilize
  ],
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
