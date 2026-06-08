import DeviceSettingsPage from './DeviceSettingsPage';

// This file should be created at: app/devices/[id]/settings/page.tsx

export default function SettingsPageRoute({ params }: { params: { id: string } }) {
    return <DeviceSettingsPage params={params} />;
}