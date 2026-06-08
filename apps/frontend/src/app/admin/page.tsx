import { getServerSession, sessionIsSuperAdmin } from '@/utils/server-session';
import { Card } from '@/components/ui';
import { Activity, AlertTriangle, HardDrive, Users } from 'lucide-react';
import { MetricCard } from '@/components/ui';
import { apiUrl } from '@/utils/api-url';

export const metadata = {
  title: 'Admin Dashboard - IoT Pilot',
  description: 'Admin dashboard for IoT Pilot platform',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AdminStats {
  userCount: number;
  deviceCount: number;
  alertCount: number;
  activeDevices: number;
}

async function getAdminStats(token: string): Promise<AdminStats> {
  try {
    const res = await fetch(apiUrl('/api/admin/stats'), {
      headers: { Cookie: `auth-token=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return { userCount: 0, deviceCount: 0, alertCount: 0, activeDevices: 0 };
    const json = await res.json();
    return json.data ?? json;
  } catch {
    return { userCount: 0, deviceCount: 0, alertCount: 0, activeDevices: 0 };
  }
}

export default async function AdminDashboard() {
  const session = await getServerSession();
  const isSuperAdmin = sessionIsSuperAdmin(session);

  // Read auth cookie for the server-side API call
  const { cookies } = await import('next/headers');
  const token = cookies().get('auth-token')?.value ?? '';
  const stats = await getAdminStats(token);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {isSuperAdmin && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-6">
          <h2 className="text-red-800 font-semibold flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            SUPERADMIN Mode
          </h2>
          <p className="text-red-700 text-sm mt-1">
            You have platform-wide access. Changes made here will affect all customers.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard size="lg" label="Total Users" value={stats.userCount} icon={<Users className="h-6 w-6" />} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <MetricCard size="lg" label="Total Devices" value={stats.deviceCount} icon={<HardDrive className="h-6 w-6" />} iconBg="bg-green-100" iconColor="text-green-600" />
        <MetricCard size="lg" label="Active Devices" value={stats.activeDevices} icon={<Activity className="h-6 w-6" />} iconBg="bg-teal-100" iconColor="text-teal-600" />
        <MetricCard size="lg" label="Open Alerts" value={stats.alertCount} icon={<AlertTriangle className="h-6 w-6" />} iconBg="bg-amber-100" iconColor="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <div className="space-y-2">
            <a href="/admin/users" className="block text-sm text-blue-600 hover:underline">Manage Users</a>
            <a href="/admin/devices" className="block text-sm text-blue-600 hover:underline">Manage Devices</a>
            <a href="/admin/system" className="block text-sm text-blue-600 hover:underline">System Health</a>
            <a href="/admin/logs" className="block text-sm text-blue-600 hover:underline">View Logs</a>
          </div>
        </Card>

        <Card className="p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Users</span>
              <span className="font-medium">{stats.userCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Devices Online</span>
              <span className="font-medium">{stats.activeDevices} / {stats.deviceCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Open Alerts</span>
              <span className={`font-medium ${stats.alertCount > 0 ? 'text-amber-600' : ''}`}>{stats.alertCount}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
