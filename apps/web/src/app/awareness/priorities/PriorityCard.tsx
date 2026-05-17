'use client';

import { useState } from 'react';

export interface PrioritySignalCard {
  id: string;
  title: string;
  summary: string;
  observedAt: Date;
  entityName: string;
  entityType: string;
  topicTags: string[];
  jurisdictionTags: string[];
  importance: number;
  confidence: number;
  sourceUrls: string[];
  sourceDomains: string[];
  priorityLabel: string | null;
  priorityDirection: string | null;
  momentum: number | null;
  rationale: string | null;
  supportingSignalIds: string[];
  rawFindingSummary: string | null;
  relevanceHint: string | null;
}

const DIRECTION_CONFIG: Record<string, { label: string; style: string; arrow: string }> = {
  rising:  { label: 'Rising',  style: 'bg-green-50 text-green-700 border border-green-200',  arrow: '↑' },
  falling: { label: 'Falling', style: 'bg-red-50 text-red-700 border border-red-200',        arrow: '↓' },
  stable:  { label: 'Stable',  style: 'bg-gray-100 text-gray-600 border border-gray-200',    arrow: '→' },
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

export function PriorityCard({ signal }: { signal: PrioritySignalCard }) {
  const [open, setOpen] = useState(false);

  const dirCfg = signal.priorityDirection
    ? (DIRECTION_CONFIG[signal.priorityDirection] ?? null)
    : null;

  const dateStr = signal.observedAt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          {/* Left: entity + priority */}
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

            {/* Priority label */}
            {signal.priorityLabel && (
              <p className="mt-1.5 text-sm font-medium text-gray-800">{signal.priorityLabel}</p>
            )}

            {/* Rationale */}
            {signal.rationale && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">{signal.rationale}</p>
            )}

            {/* Momentum + supporting signals */}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              {signal.momentum !== null && (
                <span className="flex items-center gap-1.5">
                  Momentum <Dots value={signal.momentum} />
                </span>
              )}
              {signal.supportingSignalIds.length > 0 && (
                <span>
                  {signal.supportingSignalIds.length} supporting signal
                  {signal.supportingSignalIds.length !== 1 ? 's' : ''}
                </span>
              )}
              <span>Confidence {signal.confidence}%</span>
            </div>

            {/* Inference label */}
            <p className="mt-2 text-xs text-amber-600">
              ⚠ Inferred from recent signals
            </p>
          </div>

          {/* Right: direction + date */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            {dirCfg && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${dirCfg.style}`}>
                {dirCfg.arrow} {dirCfg.label}
              </span>
            )}
            <span className="text-xs text-gray-400">{dateStr}</span>
          </div>
        </div>

        {/* Evidence toggle */}
        {(signal.sourceUrls.length > 0 || signal.rawFindingSummary) && (
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
                Latest related activity
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
