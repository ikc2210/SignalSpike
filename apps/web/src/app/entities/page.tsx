import { prisma } from '@perplexity/db';
import { approveEntity, rejectEntity } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export default async function EntitiesPage() {
  const allEntities = await prisma.entity.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const proposed = allEntities.filter((e) => e.approvalState === 'proposed');
  const approved = allEntities.filter((e) => e.approvalState === 'approved');
  const rejectedCount = allEntities.filter((e) => e.approvalState === 'rejected').length;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Entities</h1>

      {/* Proposed entities */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Proposed ({proposed.length})
        </h2>
        {proposed.length === 0 ? (
          <p className="text-sm text-gray-500">No proposed entities.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-yellow-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-yellow-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Jurisdictions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Discovered By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {proposed.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{e.entityType}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {e.jurisdictions.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">
                      {e.discoveredBy ? e.discoveredBy.slice(0, 12) + '...' : '—'}
                    </td>
                    <td className="flex gap-2 px-4 py-3">
                      <form action={approveEntity.bind(null, e.id)}>
                        <button
                          type="submit"
                          className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={rejectEntity.bind(null, e.id)}>
                        <button
                          type="submit"
                          className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Approved entities */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Approved ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-gray-500">No approved entities yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-green-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Jurisdictions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Sectors
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {approved.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{e.entityType}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {e.jurisdictions.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{e.sectors.join(', ')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          e.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {e.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Rejected count */}
      <p className="text-sm text-gray-400">
        {rejectedCount} rejected {rejectedCount === 1 ? 'entity' : 'entities'} (hidden)
      </p>
    </div>
  );
}
