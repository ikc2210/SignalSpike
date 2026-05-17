'use client';

import { useState } from 'react';
import { SIGNAL_TYPE_FAMILY } from '@perplexity/ontology';
import type { SignalType } from '@perplexity/ontology';

export interface ReportSignal {
  id: string;
  title: string;
  summary: string;
  observedAt: Date;
  entityName: string;
  entityType: string;
  signalType: string | null;
  objective: string;
  importance: number;
  confidence: number;
  topicTags: string[];
  sourceUrls: string[];
  sourceDomains: string[];
  // objective-specific
  stance?: string | null;
  positionLabel?: string | null;
  priorityDirection?: string | null;
  changeType?: string | null;
}

export interface ReportCardProps {
  signal: ReportSignal;
  reasoning: string;
  actionItem: string | null;
  rank: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAMILY_COLORS: Record<string, string> = {
  publication:   'bg-blue-100 text-blue-700',
  process:       'bg-purple-100 text-purple-700',
  participation: 'bg-teal-100 text-teal-700',
  disclosure:    'bg-orange-100 text-orange-700',
  personnel:     'bg-pink-100 text-pink-700',
  operational:   'bg-indigo-100 text-indigo-700',
};

const OBJECTIVE_LABELS: Record<string, string> = {
  activities: 'Activity',
  positions: 'Position',
  priorities: 'Priority',
};

const STANCE_COLORS: Record<string, string> = {
  support:    'bg-green-100 text-green-700',
  oppose:     'bg-red-100 text-red-700',
  mixed:      'bg-yellow-100 text-yellow-700',
  unclear:    'bg-gray-100 text-gray-500',
  monitoring: 'bg-blue-100 text-blue-700',
};

const DIRECTION_COLORS: Record<string, string> = {
  rising:  'bg-red-100 text-red-700',
  stable:  'bg-gray-100 text-gray-600',
  falling: 'bg-green-100 text-green-700',
};

function importanceBadge(score: number) {
  if (score >= 81) return { style: 'bg-red-100 text-red-700 border border-red-200', label: 'Critical' };
  if (score >= 61) return { style: 'bg-amber-100 text-amber-700 border border-amber-200', label: 'High' };
  if (score >= 31) return { style: 'bg-blue-100 text-blue-700 border border-blue-200', label: 'Medium' };
  return { style: 'bg-gray-100 text-gray-500 border border-gray-200', label: 'Low' };
}

const ABBREVS = /^(no|vs|dr|mr|ms|mrs|sen|rep|gov|sec|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|fig|vol|dept|approx|govt|inc|ltd|corp|div|est)$/i;

function cappedSummary(text: string): string {
  const re = /[.!?]+(?=\s+[A-Z]|\s*$)/g;
  const boundaries: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const lastWord = (text.slice(0, m.index).match(/(\w+)\W*$/) ?? [])[1] ?? '';
    if (lastWord.length === 1 || ABBREVS.test(lastWord)) continue;
    boundaries.push(m.index + m[0].length);
  }
  if (boundaries.length === 0) return text;
  const first = text.slice(0, boundaries[0]).trim();
  if (first.length >= 120 || boundaries.length === 1) return first;
  return text.slice(0, boundaries[1]).trim();
}

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function ReportCard({ signal, reasoning, actionItem, rank }: ReportCardProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const signalFamily =
    signal.signalType && signal.signalType in SIGNAL_TYPE_FAMILY
      ? SIGNAL_TYPE_FAMILY[signal.signalType as SignalType]
      : null;

  const familyColor = signalFamily
    ? (FAMILY_COLORS[signalFamily] ?? 'bg-gray-100 text-gray-600')
    : 'bg-gray-100 text-gray-500';

  const { style: impStyle, label: impLabel } = importanceBadge(signal.importance);
  const objectiveLabel = OBJECTIVE_LABELS[signal.objective] ?? signal.objective;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            <span className="text-base font-semibold text-gray-400 tabular-nums">{rank}.</span>
            <span className="font-semibold text-gray-800">{signal.entityName}</span>
            <span className="text-gray-300">·</span>
            <span>{formatDate(signal.observedAt)}</span>
          </div>
          <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${impStyle}`}>
            {impLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-2 text-base font-semibold leading-snug text-gray-900">
          {signal.title}
        </h3>

        {/* Summary */}
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
          {cappedSummary(signal.summary)}
        </p>
      </div>

      {/* Why it matters */}
      <div className="mx-5 mb-3 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
          Why it matters
        </p>
        <p className="text-sm text-indigo-900 leading-relaxed">{reasoning}</p>
      </div>

      {/* Recommended action */}
      {actionItem && (
        <div className="mx-5 mb-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">
            Recommended action
          </p>
          <p className="text-sm text-amber-900 leading-relaxed">
            <span className="mr-1.5 text-amber-400">→</span>
            {actionItem}
          </p>
        </div>
      )}

      {/* Footer row: badges + objective-specific metadata + sources */}
      <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
        {signal.signalType && (
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${familyColor}`}>
            {signal.signalType.replace(/_/g, ' ')}
          </span>
        )}
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
          {objectiveLabel}
        </span>

        {/* Objective-specific badges */}
        {signal.stance && signal.stance !== 'unclear' && (
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STANCE_COLORS[signal.stance] ?? 'bg-gray-100 text-gray-500'}`}>
            {signal.stance}
          </span>
        )}
        {signal.priorityDirection && (
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${DIRECTION_COLORS[signal.priorityDirection] ?? 'bg-gray-100 text-gray-500'}`}>
            {signal.priorityDirection}
          </span>
        )}
        {signal.changeType && signal.changeType !== 'unclassified' && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
            {signal.changeType.replace(/_/g, ' ')}
          </span>
        )}

        {/* Sources */}
        {signal.sourceUrls.length > 0 && (
          <button
            onClick={() => setSourcesOpen((v) => !v)}
            className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            {signal.sourceUrls.length} source{signal.sourceUrls.length !== 1 ? 's' : ''}
            <span className="text-gray-400">{sourcesOpen ? '▲' : '▼'}</span>
          </button>
        )}
      </div>

      {/* Source links */}
      {sourcesOpen && signal.sourceUrls.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {signal.sourceUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                {signal.sourceDomains[i] ?? url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
