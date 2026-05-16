import Link from 'next/link';
import { prisma } from '@perplexity/db';

export const dynamic = 'force-dynamic';

const statusStyles: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  succeeded: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default async function RunsPage() {
  const runs = await prisma.monitoringRun.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      template: { select: { name: true } },
      entity: { select: { name: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Monitoring Runs</h1>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Template
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Entity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created At
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Detail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {run.template.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {run.entity?.name ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      statusStyles[run.status] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {run.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/runs/${run.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            No runs yet. Trigger a run from the Templates page.
          </p>
        )}
      </div>
    </div>
  );
}
