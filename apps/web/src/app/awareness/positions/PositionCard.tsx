'use client';

import { useState } from 'react';

export interface PositionSignalCard {
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
  topic: string | null;
  positionLabel: string | null;
  stance: string | null;
  strength: number | null;
  evidenceSnippets: string[];
  rawFindingSummary: string | null;
  relevanceHint: string | null;
}

const STANCE_STYLES: Record<string, string> = {
  support:    'bg-green-50 text-green-700 border border-green-200',
  oppose:     'bg-red-50 text-red-700 border border-red-200',
  mixed:      'bg-amber-50 text-amber-700 border border-amber-200',
  unclear:    'bg-gray-100 text-gray-600 border border-gray-200',
  monitoring: 'bg-blue-50 text-blue-700 border border-blue-200',
};

function Dots({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value === null) return null;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < value ? 'bg-gray-700' : 'bg-gray-200'}`}
        />
      ))}
    </span>
  );
}

export function PositionCard({ signal }: { signal: PositionSignalCard }) {
  const [open, setOpen] = useState(false);

  const stanceStyle =
    signal.stance ? (STANCE_STYLES[signal.stance] ?? STANCE_STYLES['unclear']!) : null;

  const dateStr = signal.observedAt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Main row */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          {/* Left: entity + position */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{signal.entityName}</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                {signal.entityType.replace(/_/g, ' ')}
              </span>
              {signal.relevanceHint && (
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-600">
                  {signal.relevanceHint}
                </span>
              )}
            </div>

            {/* Topic */}
            {(signal.topic ?? signal.topicTags[0]) && (
              <p className="mt-0.5 text-xs text-gray-500">
                Topic: {signal.topic ?? signal.topicTags[0]}
              </p>
            )}

            {/* Position label */}
            {signal.positionLabel && (
              <p className="mt-1.5 text-sm text-gray-800">{signal.positionLabel}</p>
            )}

            {/* Summary fallback */}
            {!signal.positionLabel && signal.summary && (
              <p className="mt-1.5 line-clamp-2 text-sm text-gray-700">{signal.summary}</p>
            )}

            {/* Strength + confidence */}
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              {signal.strength !== null && (
                <span className="flex items-center gap-1.5">
                  Strength <Dots value={signal.strength} />
                </span>
              )}
              <span>Confidence {signal.confidence}%</span>
              {signal.sourceDomains.length > 0 && (
                <span>{signal.sourceDomains.length} source{signal.sourceDomains.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Right: stance + date */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            {stanceStyle && signal.stance && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${stanceStyle}`}>
                {signal.stance}
              </span>
            )}
            <span className="text-xs text-gray-400">{dateStr}</span>
          </div>
        </div>

        {/* Evidence toggle */}
        {(signal.evidenceSnippets.length > 0 || signal.sourceUrls.length > 0 || signal.rawFindingSummary) && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
          >
            {open ? '▲ Hide evidence' : '▼ Show evidence'}
          </button>
        )}
      </div>

      {/* Evidence drawer */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
          {signal.evidenceSnippets.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Evidence
              </p>
              <div className="space-y-1.5">
                {signal.evidenceSnippets.map((s, i) => (
                  <p
                    key={i}
                    className="border-l-2 border-gray-300 pl-2 text-xs italic text-gray-600"
                  >
                    {s}
                  </p>
                ))}
              </div>
            </div>
          )}

          {signal.sourceUrls.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Sources
              </p>
              <div className="space-y-0.5">
                {signal.sourceUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-blue-600 hover:underline"
                  >
                    {signal.sourceDomains[i] ?? url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {signal.rawFindingSummary && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Raw finding
              </p>
              <p className="max-h-32 overflow-y-auto text-xs text-gray-500">
                {signal.rawFindingSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
