'use client';

import { useState } from 'react';
import { SIGNAL_TYPE_FAMILY } from '@perplexity/ontology';
import type { SignalType } from '@perplexity/ontology';

export interface ActivityCardSignal {
  id: string;
  title: string;
  summary: string;
  observedAt: Date;
  entityName: string;
  entityType: string;
  signalType: string | null;
  topicTags: string[];
  jurisdictionTags: string[];
  importance: number;
  confidence: number;
  sourceUrls: string[];
  sourceDomains: string[];
  changeType: string | null;
  eventDate: Date | null;
  actorsMentioned: string[];
  rawFindingSummary: string | null;
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

function importanceBadge(score: number) {
  if (score >= 81) return { style: 'bg-red-100 text-red-700', label: 'Critical' };
  if (score >= 61) return { style: 'bg-amber-100 text-amber-700', label: 'High' };
  if (score >= 31) return { style: 'bg-blue-100 text-blue-700', label: 'Medium' };
  return { style: 'bg-gray-100 text-gray-500', label: 'Low' };
}

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ABBREVS = /^(no|vs|dr|mr|ms|mrs|sen|rep|gov|sec|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|fig|vol|dept|approx|govt|inc|ltd|corp|div|est)$/i;

function cappedSummary(text: string): string {
  // Find plausible sentence boundaries: terminator followed by space+capital or end.
  // Skip single-letter tokens (U., S.) and known abbreviations (Sen., No., etc.)
  // so "U. S." and "Sen. Cruz" are not treated as sentence breaks.
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

function formatEventDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Extract the first 1–5 meaningful bullet/numbered points from a Perplexity
// markdown finding. Strips bold markers and skips table rows, headers, and
// items that are too short or too long to be useful.
function extractKeyPoints(raw: string): string[] {
  const points: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('|') || trimmed.startsWith('#')) continue;

    const m = trimmed.match(/^(?:[-*]|\d+[.)]) +(.+)$/);
    if (!m) continue;

    const cleaned = (m[1] ?? '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length < 12 || cleaned.length > 220) continue;
    // Skip if it reads like a failed-search apology (shouldn't reach here, but defensive)
    if (/^i couldn'?t|^i'?m sorry/i.test(cleaned)) continue;

    points.push(cleaned);
    if (points.length >= 5) break;
  }
  return points;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EvidencePanel({ signal }: { signal: ActivityCardSignal }) {
  const [rawOpen, setRawOpen] = useState(false);

  const keyPoints = signal.rawFindingSummary ? extractKeyPoints(signal.rawFindingSummary) : [];

  const structuredRows = [
    signal.changeType && signal.changeType !== 'unclassified'
      ? { label: 'Action', value: signal.changeType }
      : null,
    signal.eventDate
      ? { label: 'Date', value: formatEventDate(signal.eventDate) }
      : null,
    signal.actorsMentioned.length > 0
      ? { label: 'Actors', value: signal.actorsMentioned.join(', ') }
      : null,
  ].filter((r): r is { label: string; value: string } => r !== null);

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-4">
      {/* Key points */}
      {keyPoints.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Key Points
          </p>
          <ul className="mt-1.5 space-y-1">
            {keyPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured evidence */}
      {(structuredRows.length > 0 || signal.sourceUrls.length > 0) && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Evidence
          </p>
          <dl className="mt-1.5 space-y-1">
            {structuredRows.map(({ label, value }) => (
              <div key={label} className="flex gap-2 text-xs">
                <dt className="w-14 flex-shrink-0 text-gray-400">{label}</dt>
                <dd className="text-gray-700">{value}</dd>
              </div>
            ))}
            {signal.sourceUrls.length > 0 && (
              <div className="flex gap-2 text-xs">
                <dt className="w-14 flex-shrink-0 text-gray-400">Sources</dt>
                <dd className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {signal.sourceUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {signal.sourceDomains[i] ?? url}
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Raw finding — collapsed by default */}
      {signal.rawFindingSummary && (
        <div>
          <button
            onClick={() => setRawOpen((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {rawOpen ? '▲ Hide raw finding' : '▼ View raw finding'}
          </button>
          {rawOpen && (
            <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-gray-500">
              {signal.rawFindingSummary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function ActivityCard({ signal }: { signal: ActivityCardSignal }) {
  const [open, setOpen] = useState(false);

  const signalFamily =
    signal.signalType && signal.signalType in SIGNAL_TYPE_FAMILY
      ? SIGNAL_TYPE_FAMILY[signal.signalType as SignalType]
      : null;

  const familyColor = signalFamily
    ? (FAMILY_COLORS[signalFamily] ?? 'bg-gray-100 text-gray-600')
    : 'bg-gray-100 text-gray-500';

  const { style: impStyle, label: impLabel } = importanceBadge(signal.importance);

  const hasDetail =
    signal.sourceUrls.length > 0 ||
    !!signal.rawFindingSummary ||
    signal.actorsMentioned.length > 0 ||
    (signal.changeType && signal.changeType !== 'unclassified');

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Default view */}
      <div className="p-4">
        {/* Meta row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            <span className="font-medium text-gray-800">{signal.entityName}</span>
            <span>·</span>
            <span>{formatDate(signal.observedAt)}</span>
          </div>
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${impStyle}`}>
            {impLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-1.5 text-sm font-semibold leading-snug text-gray-900">
          {signal.title}
        </h3>

        {/* Summary — 2 lines max */}
        <p className="mt-1 text-sm leading-relaxed text-gray-600">
          {cappedSummary(signal.summary)}
        </p>

        {/* Footer row: signal type + source count + expand */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {signal.signalType && (
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${familyColor}`}>
              {signal.signalType.replace(/_/g, ' ')}
            </span>
          )}

          {hasDetail && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              {signal.sourceUrls.length > 0
                ? `${signal.sourceUrls.length} source${signal.sourceUrls.length !== 1 ? 's' : ''}`
                : 'Evidence'}
              <span className="text-gray-400">{open ? '▲' : '▼'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded evidence panel */}
      {open && hasDetail && <EvidencePanel signal={signal} />}
    </div>
  );
}
