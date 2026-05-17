'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { SIGNAL_FAMILIES, SIGNAL_TYPE_FAMILY } from '@perplexity/ontology';
import type { SignalType } from '@perplexity/ontology';

interface FilterOption {
  value: string;
  label: string;
}

interface ActivityFiltersProps {
  entities: FilterOption[];
  jurisdictions: string[];
  topics: string[];
  lastUpdated: Date | null;
}

const SIGNAL_TYPES_BY_FAMILY = Object.entries(
  Object.fromEntries(
    SIGNAL_FAMILIES.map((f) => [
      f,
      Object.entries(SIGNAL_TYPE_FAMILY)
        .filter(([, family]) => family === f)
        .map(([type]) => type as SignalType),
    ]),
  ),
) as [string, SignalType[]][];

export function ActivityFilters({
  entities,
  jurisdictions,
  topics,
  lastUpdated,
}: ActivityFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  const select = (key: string) => ({
    value: searchParams.get(key) ?? '',
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => updateParam(key, e.target.value),
    className:
      'rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400',
  });

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${isPending ? 'opacity-60' : ''} transition-opacity`}
    >
      {/* Entity */}
      <select {...select('entity')}>
        <option value="">All entities</option>
        {entities.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </select>

      {/* Date from */}
      <input
        type="date"
        value={searchParams.get('from') ?? ''}
        onChange={(e) => updateParam('from', e.target.value)}
        placeholder="From"
        className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />

      {/* Date to */}
      <input
        type="date"
        value={searchParams.get('to') ?? ''}
        onChange={(e) => updateParam('to', e.target.value)}
        placeholder="To"
        className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />

      {/* Jurisdiction */}
      <select {...select('jurisdiction')}>
        <option value="">All jurisdictions</option>
        {jurisdictions.map((j) => (
          <option key={j} value={j}>
            {j}
          </option>
        ))}
      </select>

      {/* Topic */}
      <select {...select('topic')}>
        <option value="">All topics</option>
        {topics.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Signal type — grouped by family */}
      <select {...select('signalType')}>
        <option value="">All signal types</option>
        {SIGNAL_TYPES_BY_FAMILY.map(([family, types]) => (
          <optgroup key={family} label={family.charAt(0).toUpperCase() + family.slice(1)}>
            {types.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Freshness indicator */}
      {lastUpdated && (
        <span className="ml-auto text-xs text-gray-400">
          Last signal:{' '}
          {lastUpdated.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
    </div>
  );
}
