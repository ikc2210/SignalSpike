import { Suspense } from 'react';
import { prisma } from '@perplexity/db';
import type { Signal, UserProfile } from '@perplexity/db';
import { PositionFilters } from './PositionFilters.js';
import { PositionCard } from './PositionCard.js';
import type { PositionSignalCard } from './PositionCard.js';
import PositionsLoading from './loading.js';
import { scoreSignal, buildRelevanceHint } from '@/lib/personalization.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    entity?: string;
    from?: string;
    to?: string;
    jurisdiction?: string;
    topic?: string;
    signalType?: string;
    stance?: string;
  };
}

interface SignalWithRelations extends Signal {
  entity: { name: string; entityType: string };
  runFinding: { summary: string } | null;
}

function StatsRow({
  signals,
  totalCount,
}: {
  signals: SignalWithRelations[];
  totalCount: number;
}) {
  const trackedTopics = new Set(
    signals.flatMap((s) => (s.topic ? [s.topic] : s.topicTags)),
  ).size;
  const unclear = signals.filter((s) => s.stance === 'unclear').length;
  const highConfidence = signals.filter((s) => s.confidence >= 70).length;
  const affectedEntities = new Set(signals.map((s) => s.entityId)).size;

  const stats = [
    { label: 'Total positions', value: totalCount },
    { label: 'Topics covered', value: trackedTopics },
    { label: 'Unclear stance', value: unclear },
    { label: 'High confidence', value: highConfidence },
    { label: 'Entities', value: affectedEntities },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

function toPositionCard(
  s: SignalWithRelations,
  relevanceHint: string | null,
): PositionSignalCard {
  return {
    id: s.id,
    title: s.title,
    summary: s.summary,
    observedAt: s.observedAt,
    entityName: s.entity.name,
    entityType: s.entity.entityType,
    signalType: s.signalType,
    topicTags: s.topicTags,
    jurisdictionTags: s.jurisdictionTags,
    importance: s.importance,
    confidence: s.confidence,
    sourceUrls: s.sourceUrls,
    sourceDomains: s.sourceDomains,
    topic: s.topic,
    positionLabel: s.positionLabel,
    stance: s.stance,
    strength: s.strength,
    evidenceSnippets: s.evidenceSnippets,
    rawFindingSummary: s.runFinding?.summary ?? null,
    relevanceHint,
  };
}

async function PositionsContent({ searchParams }: PageProps) {
  const { entity, from, to, jurisdiction, topic, signalType, stance } = searchParams;

  const where = {
    objective: 'positions' as const,
    confidence: { gte: 60 },
    ...(entity ? { entityId: entity } : {}),
    ...(signalType ? { signalType } : {}),
    ...(stance ? { stance } : {}),
    ...(jurisdiction ? { jurisdictionTags: { has: jurisdiction } } : {}),
    ...(topic ? { topicTags: { has: topic } } : {}),
    ...((from ?? to)
      ? {
          observedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + 'T23:59:59Z') } : {}),
          },
        }
      : {}),
  };

  const [signals, totalCount, allEntities, allJurisdictions, allTopics, profile] =
    await Promise.all([
      prisma.signal.findMany({
        where,
        orderBy: { importance: 'desc' },
        take: 100,
        include: {
          entity: { select: { name: true, entityType: true } },
          runFinding: { select: { summary: true } },
        },
      }),
      prisma.signal.count({ where }),
      prisma.entity.findMany({
        where: { approvalState: 'approved', active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.signal
        .findMany({ where: { objective: 'positions', confidence: { gte: 60 } }, select: { jurisdictionTags: true }, distinct: ['jurisdictionTags'] })
        .then((rows) => [...new Set(rows.flatMap((r) => r.jurisdictionTags))].sort()),
      prisma.signal
        .findMany({ where: { objective: 'positions', confidence: { gte: 60 } }, select: { topicTags: true }, distinct: ['topicTags'] })
        .then((rows) => [...new Set(rows.flatMap((r) => r.topicTags))].sort()),
      prisma.userProfile.findUnique({ where: { id: 'singleton' } }),
    ]) as [SignalWithRelations[], number, { id: string; name: string }[], string[], string[], UserProfile | null];

  const profileForScoring = profile
    ? { role: profile.role, entity: profile.entity, entityType: profile.entityType, primaryRemit: profile.primaryRemit }
    : null;

  // Score and sort by personalization relevance
  const scored = (signals as SignalWithRelations[]).map((s) => ({
    signal: s,
    breakdown: scoreSignal(
      { entityName: s.entity.name, entityType: s.entity.entityType, signalType: s.signalType, topicTags: s.topicTags, importance: s.importance },
      profileForScoring,
    ),
  }));
  scored.sort((a, b) => b.breakdown.total - a.breakdown.total);

  const lastUpdated = signals.length > 0 ? (signals[0]?.extractedAt ?? null) : null;
  const hasFilters = Boolean(entity ?? from ?? to ?? jurisdiction ?? topic ?? signalType ?? stance);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Positions</h1>
        <p className="mt-1 text-sm text-gray-500">
          What monitored entities appear to believe, support, oppose, or advocate.
        </p>
      </div>

      <PositionFilters
        entities={allEntities.map((e) => ({ value: e.id, label: e.name }))}
        jurisdictions={allJurisdictions}
        topics={allTopics}
        lastUpdated={lastUpdated}
      />

      <StatsRow signals={signals as SignalWithRelations[]} totalCount={totalCount} />

      {scored.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-700">
            {hasFilters ? 'No positions match the current filters.' : 'No positions extracted yet.'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {hasFilters
              ? 'Try broadening your filters.'
              : 'Run a monitoring template to start collecting position signals.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {scored.map(({ signal, breakdown }) => (
            <PositionCard
              key={signal.id}
              signal={toPositionCard(signal, buildRelevanceHint(breakdown))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PositionsPage(props: PageProps) {
  return (
    <Suspense fallback={<PositionsLoading />}>
      <PositionsContent {...props} />
    </Suspense>
  );
}
