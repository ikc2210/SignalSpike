'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type Props = {
  objectives: string[];
  cadences: string[];
  entityTypes: string[];
  current: { objective?: string; cadence?: string; entityType?: string };
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  national_legislature: 'National Legislature',
  executive_body: 'Executive Body',
  cross_cutting_regulator: 'Cross-Cutting Regulator',
  sectoral_regulator: 'Sectoral Regulator',
  court_tribunal: 'Court / Tribunal',
  international_organization: 'International Organization',
  frontier_developer: 'Frontier Developer',
  compute_infra_provider: 'Compute Infrastructure',
  standards_body: 'Standards Body',
  safety_institute: 'Safety Institute',
};

const selectClass =
  'rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400 capitalize';

export function TemplateFilters({ objectives, cadences, entityTypes, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasFilters = !!(current.objective || current.cadence || current.entityType);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Filter:</span>

      <select
        value={current.objective ?? ''}
        onChange={(e) => update('objective', e.target.value)}
        className={selectClass}
      >
        <option value="">All Objectives</option>
        {objectives.map((o) => (
          <option key={o} value={o} className="capitalize">
            {o}
          </option>
        ))}
      </select>

      <select
        value={current.cadence ?? ''}
        onChange={(e) => update('cadence', e.target.value)}
        className={selectClass}
      >
        <option value="">All Cadences</option>
        {cadences.map((c) => (
          <option key={c} value={c} className="capitalize">
            {c}
          </option>
        ))}
      </select>

      <select
        value={current.entityType ?? ''}
        onChange={(e) => update('entityType', e.target.value)}
        className={selectClass}
      >
        <option value="">All Entity Types</option>
        {entityTypes.map((et) => (
          <option key={et} value={et}>
            {ENTITY_TYPE_LABELS[et] ?? et}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="rounded px-2 py-1.5 text-xs text-gray-400 hover:text-gray-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}
