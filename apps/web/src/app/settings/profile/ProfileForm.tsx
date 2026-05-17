'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveUserProfile } from '@/lib/actions';

const ENTITY_TYPE_OPTIONS = [
  { value: 'national_legislature', label: 'National Legislature' },
  { value: 'executive_body', label: 'Executive Body' },
  { value: 'cross_cutting_regulator', label: 'Cross-Cutting Regulator' },
  { value: 'sectoral_regulator', label: 'Sectoral Regulator' },
  { value: 'court_tribunal', label: 'Court / Tribunal' },
  { value: 'international_organization', label: 'International Organization' },
  { value: 'frontier_developer', label: 'Frontier Developer' },
  { value: 'compute_infra_provider', label: 'Compute Infrastructure Provider' },
  { value: 'standards_body', label: 'Standards Body' },
  { value: 'safety_institute', label: 'Safety Institute' },
];

const PRIMARY_REMIT_OPTIONS = [
  'Policy',
  'Legal',
  'Compliance',
  'Government Affairs',
  'Risk',
  'Product',
  'Safety',
  'Strategy',
];

interface ProfileFormProps {
  profile: {
    role: string | null;
    entity: string | null;
    entityType: string | null;
    primaryRemit: string | null;
  } | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, action] = useFormState(saveUserProfile, null);

  return (
    <form action={action} className="mt-6 max-w-sm space-y-5">
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <input
          id="role"
          name="role"
          type="text"
          defaultValue={profile?.role ?? ''}
          placeholder="e.g. Senior Policy Analyst"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="entity" className="block text-sm font-medium text-gray-700">
          Entity
        </label>
        <input
          id="entity"
          name="entity"
          type="text"
          defaultValue={profile?.entity ?? ''}
          placeholder="e.g. Anthropic"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="entityType" className="block text-sm font-medium text-gray-700">
          Entity Type
        </label>
        <select
          id="entityType"
          name="entityType"
          defaultValue={profile?.entityType ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select type</option>
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="primaryRemit" className="block text-sm font-medium text-gray-700">
          Primary Remit
        </label>
        <select
          id="primaryRemit"
          name="primaryRemit"
          defaultValue={profile?.primaryRemit ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select remit</option>
          {PRIMARY_REMIT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton />
        {state?.saved && (
          <span className="text-sm text-gray-400">Saved</span>
        )}
      </div>
    </form>
  );
}
