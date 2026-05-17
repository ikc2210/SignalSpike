import { Suspense } from 'react';
import { prisma } from '@perplexity/db';
import type { Signal, UserProfile } from '@perplexity/db';
import { PriorityFilters } from './PriorityFilters.js';
import { PriorityCard } from './PriorityCard.js';
import type { PrioritySignalCard } from './PriorityCard.js';
import PrioritiesLoading from './loading.js';
import { scoreSignal, buildRelevanceHint } from '@/lib/personalization.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    entity?: string;
    from?: string;
    to?: string;
    jurisdiction?: string;
    topic?: string;
    direction?: string;
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
  const rising = signals.filter((s) => s.priorityDirection === 'rising').length;
  const highMomentum = signals.filter((s) => (s.momentum ?? 0) >= 4).length;
  const affectedEntities = new Set(signals.map((s) => s.entityId)).size;

  const stats = [
    { label: 'Total priorities', value: totalCount },
    { label: 'Rising', value: rising },
    { label: 'High momentum', value: highMomentum },
    { label: 'Entities', value: affectedEntities },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
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

function toPriorityCard(
  s: SignalWithRelations,
  relevanceHint: string | null,
): PrioritySignalCard {
  return {
    id: s.id,
    title: s.title,
    summary: s.summary,
    observedAt: s.observedAt,
    entityName: s.entity.name,
    entityType: s.entity.entityType,
    topicTags: s.topicTags,
    jurisdictionTags: s.jurisdictionTags,
    importance: s.importance,
    confidence: s.confidence,
    sourceUrls: s.sourceUrls,
    sourceDomains: s.sourceDomains,
    priorityLabel: s.priorityLabel,
    priorityDirection: s.priorityDirection,
    momentum: s.momentum,
    rationale: s.rationale,
    supportingSignalIds: s.supportingSignalIds,
    rawFindingSummary: s.runFinding?.summary ?? null,
    relevanceHint,
  };
}

async function PrioritiesContent({ searchParams }: PageProps) {
  const { entity, from, to, jurisdiction, topic, direction } = searchParams;

  const where = {
    objective: 'priorities' as const,
    ...(entity ? { entityId: entity } : {}),
    ...(direction ? { priorityDirection: direction } : {}),
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
        .findMany({ where: { objective: 'priorities' }, select: { jurisdictionTags: true }, distinct: ['jurisdictionTags'] })
        .then((rows) => [...new Set(rows.flatMap((r) => r.jurisdictionTags))].sort()),
      prisma.signal
        .findMany({ where: { objective: 'priorities' }, select: { topicTags: true }, distinct: ['topicTags'] })
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
  const hasFilters = Boolean(entity ?? from ?? to ?? jurisdiction ?? topic ?? direction);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Priorities</h1>
        <p className="mt-1 text-sm text-gray-500">
          Inferred strategic priorities derived from recent signals.
        </p>
      </div>

      <PriorityFilters
        entities={allEntities.map((e) => ({ value: e.id, label: e.name }))}
        jurisdictions={allJurisdictions}
        topics={allTopics}
        lastUpdated={lastUpdated}
      />

      <StatsRow signals={signals as SignalWithRelations[]} totalCount={totalCount} />

      {scored.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-700">
            {hasFilters ? 'No priorities match the current filters.' : 'No priorities inferred yet.'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {hasFilters
              ? 'Try broadening your filters.'
              : 'Run monitoring templates to start inferring priorities.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {scored.map(({ signal, breakdown }) => (
            <PriorityCard
              key={signal.id}
              signal={toPriorityCard(signal, buildRelevanceHint(breakdown))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PrioritiesPage(props: PageProps) {
  return (
    <Suspense fallback={<PrioritiesLoading />}>
      <PrioritiesContent {...props} />
    </Suspense>
  );
}
