'use client';

import { useFormStatus } from 'react-dom';

export function RunButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded px-2 py-1 text-xs font-medium text-white transition-colors ${
        pending ? 'cursor-not-allowed bg-gray-400' : 'bg-black hover:bg-gray-800'
      }`}
    >
      {pending ? 'Running…' : 'Run'}
    </button>
  );
}

export function ToggleButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={active ? 'Deactivate' : 'Activate'}
      className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-50 ${
        pending ? '' : 'cursor-pointer'
      } ${active ? 'bg-green-500' : 'bg-gray-300'}`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
