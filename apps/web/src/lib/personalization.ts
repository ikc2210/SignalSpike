import { SIGNAL_TYPE_FAMILY } from '@perplexity/ontology';

// Maps primaryRemit / role keywords → preferred signal families.
// Checked in order; first match wins.
const REMIT_FAMILY_MAP: [string, string[]][] = [
  ['policy',             ['process', 'participation']],
  ['legal',              ['publication', 'disclosure']],
  ['compliance',         ['publication', 'disclosure']],
  ['government affairs', ['process', 'participation']],
  ['risk',               ['disclosure', 'operational']],
  ['product',            ['operational', 'publication']],
  ['safety',             ['operational', 'publication']],
  ['strategy',           ['process', 'operational']],
];

export interface UserProfileForScoring {
  role?: string | null;
  entity?: string | null;
  entityType?: string | null;
  primaryRemit?: string | null;
}

export interface SignalForScoring {
  entityName: string;
  entityType: string;
  signalType?: string | null;
  topicTags: string[];
  importance: number;
}

export interface ScoreBreakdown {
  base: number;
  entityMatch: number;
  entityTypeMatch: number;
  remitMatch: number;
  familyAffinity: number;
  tokenOverlap: number;
  total: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;/]+/)
    .filter((t) => t.length > 2);
}

function resolvePreferredFamilies(profile: UserProfileForScoring): string[] {
  const remit = (profile.primaryRemit ?? '').toLowerCase();
  const role = (profile.role ?? '').toLowerCase();
  for (const [key, families] of REMIT_FAMILY_MAP) {
    if (remit.includes(key)) return families;
  }
  for (const [key, families] of REMIT_FAMILY_MAP) {
    if (role.includes(key)) return families;
  }
  return [];
}

export function scoreSignal(
  signal: SignalForScoring,
  profile: UserProfileForScoring | null,
): ScoreBreakdown {
  const base = signal.importance;

  if (!profile) {
    return { base, entityMatch: 0, entityTypeMatch: 0, remitMatch: 0, familyAffinity: 0, tokenOverlap: 0, total: base };
  }

  const entityMatch =
    profile.entity && signal.entityName.toLowerCase() === profile.entity.toLowerCase() ? 40 : 0;

  const entityTypeMatch =
    profile.entityType && signal.entityType === profile.entityType ? 20 : 0;

  const remitTokens = tokenize(profile.primaryRemit ?? '');
  const topicsLower = signal.topicTags.map((t) => t.toLowerCase());
  const matchingTokens = remitTokens.filter((t) =>
    topicsLower.some((topic) => topic.includes(t)),
  );
  const remitMatch = matchingTokens.length > 0 ? 20 : 0;
  const tokenOverlap = Math.min(Math.max(matchingTokens.length - 1, 0) * 3, 10);

  const preferredFamilies = resolvePreferredFamilies(profile);
  const signalFamily = signal.signalType
    ? ((SIGNAL_TYPE_FAMILY as Record<string, string>)[signal.signalType] ?? null)
    : null;
  const familyAffinity =
    signalFamily !== null && preferredFamilies.includes(signalFamily) ? 10 : 0;

  const total = base + entityMatch + entityTypeMatch + remitMatch + familyAffinity + tokenOverlap;

  return { base, entityMatch, entityTypeMatch, remitMatch, familyAffinity, tokenOverlap, total };
}

export function buildRelevanceHint(bd: ScoreBreakdown): string | null {
  if (bd.entityMatch > 0) return 'Relevant to your entity';
  if (bd.entityTypeMatch > 0) return 'Matches your organization type';
  if (bd.remitMatch > 0) return 'Matches your remit';
  return null;
}
