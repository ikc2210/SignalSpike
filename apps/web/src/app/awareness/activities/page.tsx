import { Suspense } from 'react';
import { prisma } from '@perplexity/db';
import type { Signal, UserProfile } from '@perplexity/db';
import { ActivityFilters } from './ActivityFilters.js';
import { ActivityCard } from './ActivityCard.js';
import ActivitiesLoading from './loading.js';
import { scoreSignal } from '@/lib/personalization.js';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: {
    entity?: string;
    from?: string;
    to?: string;
    jurisdiction?: string;
    topic?: string;
    signalType?: string;
  };
}

interface SignalWithRelations extends Signal {
  entity: { name: string; entityType: string };
  runFinding: { summary: string } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function groupByRecency(signals: SignalWithRelations[]) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  return {
    today: signals.filter((s) => s.observedAt >= todayStart),
    thisWeek: signals.filter((s) => s.observedAt >= weekStart && s.observedAt < todayStart),
    earlier: signals.filter((s) => s.observedAt < weekStart),
  };
}

function toCardSignal(s: SignalWithRelations) {
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
    changeType: s.changeType,
    eventDate: s.eventDate,
    actorsMentioned: s.actorsMentioned,
    rawFindingSummary: s.runFinding?.summary ?? null,
  };
}

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

function StatsRow({
  signals,
  totalCount,
}: {
  signals: SignalWithRelations[];
  totalCount: number;
}) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const newToday = signals.filter((s) => s.observedAt >= todayStart).length;
  const newThisWeek = signals.filter((s) => s.observedAt >= weekStart).length;
  const highImportance = signals.filter((s) => s.importance >= 61).length;
  const affectedEntities = new Set(signals.map((s) => s.entityId)).size;

  const stats = [
    { label: 'Total signals', value: totalCount },
    { label: 'Today', value: newToday },
    { label: 'This week', value: newThisWeek },
    { label: 'High importance', value: highImportance },
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

// ---------------------------------------------------------------------------
// Feed section
// ---------------------------------------------------------------------------

function FeedSection({
  label,
  signals,
}: {
  label: string;
  signals: SignalWithRelations[];
}) {
  if (signals.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </h2>
      <div className="space-y-2">
        {signals.map((s) => (
          <ActivityCard key={s.id} signal={toCardSignal(s)} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

async function ActivitiesContent({ searchParams }: PageProps) {
  const { entity, from, to, jurisdiction, topic, signalType } = searchParams;

  // Build the Prisma where clause from active filters.
  // Minimum confidence of 60 excludes prefill-only signals (confidence=50) that
  // were created before the extraction pipeline was operational.
  const where = {
    objective: 'activities' as const,
    confidence: { gte: 60 },
    ...(entity ? { entityId: entity } : {}),
    ...(signalType ? { signalType } : {}),
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

  const [signals, totalCount, allEntities, allJurisdictions, allTopics, profile] = await Promise.all([
    prisma.signal.findMany({
      where,
      orderBy: { observedAt: 'desc' },
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
    // Distinct jurisdictions/topics scoped to activities only
    prisma.signal
      .findMany({ where: { objective: 'activities' }, select: { jurisdictionTags: true }, distinct: ['jurisdictionTags'] })
      .then((rows) => [...new Set(rows.flatMap((r) => r.jurisdictionTags))].sort()),
    prisma.signal
      .findMany({ where: { objective: 'activities' }, select: { topicTags: true }, distinct: ['topicTags'] })
      .then((rows) => [...new Set(rows.flatMap((r) => r.topicTags))].sort()),
    prisma.userProfile.findUnique({ where: { id: 'singleton' } }),
  ]) as [
    SignalWithRelations[],
    number,
    { id: string; name: string }[],
    string[],
    string[],
    UserProfile | null,
  ];

  const lastUpdated =
    signals.length > 0 ? (signals[0]?.extractedAt ?? null) : null;

  const profileForScoring = profile
    ? { role: profile.role, entity: profile.entity, entityType: profile.entityType, primaryRemit: profile.primaryRemit }
    : null;

  function sortBucket(bucket: SignalWithRelations[]): SignalWithRelations[] {
    return [...bucket].sort((a, b) => {
      const sa = scoreSignal(
        { entityName: a.entity.name, entityType: a.entity.entityType, signalType: a.signalType, topicTags: a.topicTags, importance: a.importance },
        profileForScoring,
      ).total;
      const sb = scoreSignal(
        { entityName: b.entity.name, entityType: b.entity.entityType, signalType: b.signalType, topicTags: b.topicTags, importance: b.importance },
        profileForScoring,
      ).total;
      return sb - sa;
    });
  }

  const { today, thisWeek, earlier } = groupByRecency(signals);

  const hasFilters = Boolean(entity ?? from ?? to ?? jurisdiction ?? topic ?? signalType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
        <p className="mt-1 text-sm text-gray-500">
          Normalized signals from monitored entities, most recent first.
        </p>
      </div>

      {/* Filter bar */}
      <ActivityFilters
        entities={allEntities.map((e) => ({ value: e.id, label: e.name }))}
        jurisdictions={allJurisdictions}
        topics={allTopics}
        lastUpdated={lastUpdated}
      />

      {/* Stats row */}
      <StatsRow signals={signals} totalCount={totalCount} />

      {/* Feed */}
      {signals.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-700">
            {hasFilters ? 'No signals match the current filters.' : 'No signals extracted yet.'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {hasFilters
              ? 'Try broadening your filters.'
              : 'Run a monitoring template to start collecting signals.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <FeedSection label="Today" signals={sortBucket(today)} />
          <FeedSection label="This week" signals={sortBucket(thisWeek)} />
          <FeedSection label="Earlier" signals={sortBucket(earlier)} />
        </div>
      )}
    </div>
  );
}

export default function ActivitiesPage(props: PageProps) {
  return (
    <Suspense fallback={<ActivitiesLoading />}>
      <ActivitiesContent {...props} />
    </Suspense>
  );
}
