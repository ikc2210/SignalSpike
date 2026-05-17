import { Suspense } from 'react';
import { prisma } from '@perplexity/db';
import type { Signal, UserProfile } from '@perplexity/db';
import { scoreSignal } from '@/lib/personalization.js';
import { generateReportInsights } from '@/lib/report-generator.js';
import type { SignalForReport } from '@/lib/report-generator.js';
import { ReportCard } from './ReportCard.js';
import type { ReportSignal } from './ReportCard.js';

export const dynamic = 'force-dynamic';

interface SignalWithRelations extends Signal {
  entity: { name: string; entityType: string };
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  ai_developer:      'AI Developer',
  regulator:         'Regulator',
  standards_body:    'Standards Body',
  civil_society:     'Civil Society',
  academic:          'Academic Institution',
  think_tank:        'Think Tank',
  trade_association: 'Trade Association',
  government_body:   'Government Body',
  international_org: 'International Organization',
  media:             'Media',
};

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function toSignalForReport(s: SignalWithRelations): SignalForReport {
  return {
    id: s.id, title: s.title, summary: s.summary,
    entityName: s.entity.name, entityType: s.entity.entityType,
    signalType: s.signalType, objective: s.objective,
    importance: s.importance, confidence: s.confidence,
    topicTags: s.topicTags, stance: s.stance,
    positionLabel: s.positionLabel, priorityDirection: s.priorityDirection,
    rationale: s.rationale, changeType: s.changeType,
  };
}

function toReportSignal(s: SignalWithRelations): ReportSignal {
  return {
    id: s.id, title: s.title, summary: s.summary,
    observedAt: s.observedAt, entityName: s.entity.name,
    entityType: s.entity.entityType, signalType: s.signalType,
    objective: s.objective, importance: s.importance,
    confidence: s.confidence, topicTags: s.topicTags,
    sourceUrls: s.sourceUrls, sourceDomains: s.sourceDomains,
    stance: s.stance, positionLabel: s.positionLabel,
    priorityDirection: s.priorityDirection, changeType: s.changeType,
  };
}

function KeyActions({ items }: { items: { rank: number; title: string; actionItem: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-500">Key Actions</h2>
      <ol className="space-y-2">
        {items.map(({ rank, title, actionItem }) => (
          <li key={rank} className="flex gap-3 text-sm text-amber-900">
            <span className="flex-shrink-0 font-semibold text-amber-400 tabular-nums">{rank}.</span>
            <span><span className="font-medium">{title} — </span>{actionItem}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EmptyState({ hasProfile }: { hasProfile: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
      <p className="text-sm font-medium text-gray-700">No signals available yet.</p>
      <p className="mt-1 text-xs text-gray-400">
        {hasProfile
          ? 'Run monitoring templates to start collecting signals.'
          : 'Set your profile in Settings → User Information so the briefing can be personalized.'}
      </p>
    </div>
  );
}

async function ReportContent() {
  const [signals, profile] = await Promise.all([
    prisma.signal.findMany({
      where: { confidence: { gte: 60 } },
      orderBy: { observedAt: 'desc' },
      take: 200,
      include: { entity: { select: { name: true, entityType: true } } },
    }) as Promise<SignalWithRelations[]>,
    prisma.userProfile.findUnique({ where: { id: 'singleton' } }),
  ]);

  const profileForScoring = profile
    ? { role: profile.role, entity: profile.entity, entityType: profile.entityType, primaryRemit: profile.primaryRemit }
    : null;

  const scored = signals
    .map((s) => ({
      signal: s,
      score: scoreSignal(
        { entityName: s.entity.name, entityType: s.entity.entityType, signalType: s.signalType, topicTags: s.topicTags, importance: s.importance },
        profileForScoring,
      ).total,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (scored.length === 0) return <EmptyState hasProfile={!!profile} />;

  const topSignals = scored.map(({ signal }) => signal);
  const insights = await generateReportInsights(
    topSignals.map(toSignalForReport),
    profile
      ? { role: profile.role, entity: profile.entity, entityType: profile.entityType, primaryRemit: profile.primaryRemit }
      : {},
  ).catch(() => []);

  const insightMap = new Map(insights.map((ins) => [ins.signalId, ins]));

  const keyActions = scored
    .map(({ signal }, i) => {
      const a = insightMap.get(signal.id)?.actionItem;
      return a ? { rank: i + 1, title: signal.title, actionItem: a } : null;
    })
    .filter((x): x is { rank: number; title: string; actionItem: string } => x !== null);

  const profileLabel = [
    profile?.role,
    profile?.entity
      ? `${profile.entity}${profile.entityType ? ` (${ENTITY_TYPE_LABELS[profile.entityType] ?? profile.entityType})` : ''}`
      : null,
  ].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Intelligence Briefing</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          {formatDate(new Date())}{profileLabel ? ` · ${profileLabel}` : ''}
        </p>
      </div>

      <KeyActions items={keyActions} />

      <div className="space-y-4">
        {scored.map(({ signal }, i) => {
          const insight = insightMap.get(signal.id);
          return (
            <ReportCard
              key={signal.id}
              signal={toReportSignal(signal)}
              reasoning={insight?.reasoning ?? 'This signal ranked highly based on your profile and importance score.'}
              actionItem={insight?.actionItem ?? null}
              rank={i + 1}
            />
          );
        })}
      </div>

      <p className="text-right text-xs text-gray-300">
        {scored.length} developments · ranked by relevance to your profile
      </p>
    </div>
  );
}

function ReportLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-56 rounded bg-gray-200" />
        <div className="mt-1.5 h-4 w-80 rounded bg-gray-100" />
      </div>
      <div className="h-24 rounded-xl bg-amber-50 border border-amber-100" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="h-5 w-14 rounded-full bg-gray-200" />
          </div>
          <div className="h-5 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-16 rounded-lg bg-indigo-50" />
        </div>
      ))}
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportLoading />}>
      <ReportContent />
    </Suspense>
  );
}
