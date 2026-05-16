import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@perplexity/db';

const statusStyles: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  succeeded: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default async function RunDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const run = await prisma.monitoringRun.findUnique({
    where: { id: params.id },
    include: {
      template: true,
      entity: true,
      sources: { orderBy: { citedAt: 'asc' } },
      findings: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!run) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/runs" className="text-sm text-gray-500 hover:underline">
          Runs
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm font-medium text-gray-900">{run.id.slice(0, 12)}...</span>
      </div>

      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{run.template.name}</h1>
            {run.entity && (
              <p className="mt-1 text-sm text-gray-600">Entity: {run.entity.name}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize ${
              statusStyles[run.status] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {run.status}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{run.createdAt.toLocaleString()}</dd>
          </div>
          {run.startedAt && (
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Started</dt>
              <dd className="mt-1 text-sm text-gray-900">{run.startedAt.toLocaleString()}</dd>
            </div>
          )}
          {run.completedAt && (
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Completed</dt>
              <dd className="mt-1 text-sm text-gray-900">{run.completedAt.toLocaleString()}</dd>
            </div>
          )}
        </dl>

        {run.status === 'failed' && run.errorMessage && (
          <div className="mt-4 rounded bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="mt-1 text-sm text-red-700">{run.errorMessage}</p>
          </div>
        )}
      </div>

      {/* Query */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Query</h2>
        <pre className="overflow-x-auto rounded bg-gray-50 p-4 font-mono text-sm text-gray-800">
          {run.queryExpanded}
        </pre>
      </div>

      {/* Findings */}
      {run.findings.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Findings ({run.findings.length})
          </h2>
          <div className="space-y-4">
            {run.findings.map((f) => (
              <div key={f.id} className="rounded border border-gray-100 bg-gray-50 p-4">
                <p className="whitespace-pre-wrap text-sm text-gray-800">{f.summary}</p>
                {f.topics.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {f.topics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 ring-1 ring-gray-200"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {run.sources.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Sources ({run.sources.length})
          </h2>
          <ul className="space-y-2">
            {run.sources.map((s) => (
              <li key={s.id} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-xs text-gray-400">{s.domain ?? ''}</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {s.title ?? s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
