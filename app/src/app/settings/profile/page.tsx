import ProfileSettingsClient from './ProfileSettingsClient';

// This route requires authentication and uses client-side context
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ProfileSettingsPage() {
  return <ProfileSettingsClient />;
}
