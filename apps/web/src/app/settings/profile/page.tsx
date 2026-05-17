import { prisma } from '@perplexity/db';
import { ProfileForm } from './ProfileForm';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const profile = await prisma.userProfile.findUnique({ where: { id: 'singleton' } });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">User Information</h1>
      <p className="mt-1 text-sm text-gray-400">
        Your profile is used to personalise monitoring and surface relevant signals.
      </p>
      <ProfileForm profile={profile} />
    </div>
  );
}
