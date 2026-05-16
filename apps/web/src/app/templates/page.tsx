import { prisma } from '@perplexity/db';
import { toggleTemplateActive, enqueueTemplateRun } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const templates = await prisma.queryTemplate.findMany({
    orderBy: [{ templateType: 'asc' }, { name: 'asc' }],
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Query Templates</h1>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Objective
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Cadence
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Entity Types
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Active
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {templates.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.name}</td>
                <td className="px-4 py-3">
                  {t.templateType === 'entity_type_discovery' ? (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      Discovery
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      Monitoring
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm capitalize text-gray-600">{t.objective}</td>
                <td className="px-4 py-3 text-sm capitalize text-gray-600">{t.cadence}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {t.entityTypes.join(', ')}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleTemplateActive.bind(null, t.id)}>
                    <button
                      type="submit"
                      className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors ${
                        t.active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      title={t.active ? 'Deactivate' : 'Activate'}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                          t.active ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <form action={enqueueTemplateRun.bind(null, t.id)}>
                    <button
                      type="submit"
                      className="rounded bg-black px-3 py-1 text-xs font-medium text-white hover:bg-gray-800"
                    >
                      Run Now
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            No templates yet. Run the seed script to populate templates.
          </p>
        )}
      </div>
    </div>
  );
}
