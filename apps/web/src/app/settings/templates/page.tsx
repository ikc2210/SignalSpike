import { Suspense } from 'react';
import type { QueryTemplate } from '@perplexity/db';
import { prisma } from '@perplexity/db';
import { toggleTemplateActive, enqueueTemplateRun } from '@/lib/actions';
import { TemplateFilters } from './TemplateFilters';
import { RunButton, ToggleButton } from './TemplateActions';

export const dynamic = 'force-dynamic';

const ENTITY_TYPE_ORDER = [
  'national_legislature',
  'executive_body',
  'cross_cutting_regulator',
  'sectoral_regulator',
  'court_tribunal',
  'international_organization',
  'frontier_developer',
  'compute_infra_provider',
  'standards_body',
  'safety_institute',
];

const ENTITY_TYPE_LABELS: Record<string, string> = {
  national_legislature: 'National Legislature',
  executive_body: 'Executive Body',
  cross_cutting_regulator: 'Cross-Cutting Regulator',
  sectoral_regulator: 'Sectoral Regulator',
  court_tribunal: 'Court / Tribunal',
  international_organization: 'International Organization',
  frontier_developer: 'Frontier Developer',
  compute_infra_provider: 'Compute Infrastructure Provider',
  standards_body: 'Standards Body',
  safety_institute: 'Safety Institute',
};

function sortByActive(templates: QueryTemplate[]): QueryTemplate[] {
  return [...templates].sort((a, b) => Number(b.active) - Number(a.active));
}

function TemplateCard({ template }: { template: QueryTemplate }) {
  const inactive = !template.active;
  return (
    <div className={`rounded-md p-3 transition-opacity ${inactive ? 'opacity-40' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{template.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
              {template.objective}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
              {template.cadence}
            </span>
          </div>
          {template.domainAllowlist.length > 0 && (
            <details className="mt-1.5">
              <summary className="cursor-pointer list-none">
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-500 hover:bg-indigo-100">
                  {template.domainAllowlist.length}{' '}
                  {template.domainAllowlist.length === 1 ? 'domain' : 'domains'} ▾
                </span>
              </summary>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-1">
                {template.domainAllowlist.map((d) => (
                  <span key={d} className="font-mono text-xs text-gray-400">
                    {d}
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <form action={toggleTemplateActive.bind(null, template.id)}>
            <ToggleButton active={template.active} />
          </form>
          {template.active && (
            <form action={enqueueTemplateRun.bind(null, template.id)}>
              <RunButton />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyColumn({ message }: { message: string }) {
  return <p className="px-3 py-6 text-center text-xs text-gray-300">{message}</p>;
}

export default async function QueryTemplatesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const objective = typeof searchParams.objective === 'string' ? searchParams.objective : undefined;
  const cadence = typeof searchParams.cadence === 'string' ? searchParams.cadence : undefined;
  const entityType =
    typeof searchParams.entityType === 'string' ? searchParams.entityType : undefined;

  const [allTemplates, filteredTemplates] = await Promise.all([
    prisma.queryTemplate.findMany({ select: { objective: true, cadence: true, entityTypes: true } }),
    prisma.queryTemplate.findMany({
      where: {
        ...(objective ? { objective } : {}),
        ...(cadence ? { cadence } : {}),
        ...(entityType ? { entityTypes: { has: entityType } } : {}),
      },
    }),
  ]);

  const objectives = [...new Set(allTemplates.map((t) => t.objective))].sort();
  const cadences = [...new Set(allTemplates.map((t) => t.cadence))].sort();
  const entityTypes = [...new Set(allTemplates.flatMap((t) => t.entityTypes))].sort();

  // Each group contains all templates (active and inactive) for that entity type,
  // sorted active-first within each column.
  const groups = ENTITY_TYPE_ORDER.map((et) => ({
    entityType: et,
    label: ENTITY_TYPE_LABELS[et] ?? et,
    discovery: sortByActive(
      filteredTemplates.filter(
        (t) => t.templateType === 'entity_type_discovery' && t.entityTypes.includes(et),
      ),
    ),
    monitoring: sortByActive(
      filteredTemplates.filter(
        (t) => t.templateType === 'entity_monitoring' && t.entityTypes.includes(et),
      ),
    ),
  })).filter((g) => g.discovery.length > 0 || g.monitoring.length > 0);

  const currentFilters = { objective, cadence, entityType };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Query Templates</h1>
        <Suspense fallback={null}>
          <TemplateFilters
            objectives={objectives}
            cadences={cadences}
            entityTypes={entityTypes}
            current={currentFilters}
          />
        </Suspense>
      </div>

      {groups.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">
          No templates match the current filters.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {groups.map((group) => (
            <div key={group.entityType}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                {group.label}
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-[1fr_2fr] divide-x divide-gray-200">
                  {/* Discovery column */}
                  <div>
                    <div className="border-b border-gray-200 bg-blue-50 px-4 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                        Discovery
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.discovery.length > 0 ? (
                        group.discovery.map((t) => <TemplateCard key={t.id} template={t} />)
                      ) : (
                        <EmptyColumn message="No discovery template" />
                      )}
                    </div>
                  </div>

                  {/* Monitoring column */}
                  <div>
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Monitoring
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {group.monitoring.length > 0 ? (
                        group.monitoring.map((t) => <TemplateCard key={t.id} template={t} />)
                      ) : (
                        <EmptyColumn message="No monitoring templates match current filters" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
