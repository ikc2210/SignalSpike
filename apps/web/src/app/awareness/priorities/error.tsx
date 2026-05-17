'use client';

import { useEffect } from 'react';

export default function PrioritiesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Priorities]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-medium text-red-600">Failed to load priorities</p>
      <p className="mt-1 text-xs text-gray-500">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
      >
        Retry
      </button>
    </div>
  );
}
