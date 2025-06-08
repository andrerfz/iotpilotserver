import { getServerSession, sessionIsSuperAdmin } from '@/lib/auth';
import { tenantPrisma, withTenant } from '@/lib/tenant-middleware';
import { getCurrentTenant } from '@/lib/tenant-middleware';
import { Card } from '@heroui/card';
import { 
  Users, 
  HardDrive, 
  AlertTriangle, 
  Activity 
} from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard - IoT Pilot',
  description: 'Admin dashboard for IoT Pilot platform',
};

async function getAdminStats() {
  const session = await getServerSession();

  if (!session) {
    return {
      userCount: 0,
      deviceCount: 0,
      alertCount: 0,
      activeDevices: 0,
    };
  }

  // Get tenant context
  const isSuperAdmin = sessionIsSuperAdmin(session);
  const customerId = session.customerId;

  // Create tenant context
  const tenantContext = {
    customerId,
    userId: session.userId,
    role: session.role,
    isSuperAdmin
  };

  // Run queries with tenant context
  return await withTenant(tenantContext, async () => {
    const [userCount, deviceCount, alertCount, activeDevices] = await Promise.all([
      tenantPrisma.client.user.count(),
      tenantPrisma.client.device.count(),
      tenantPrisma.client.alert.count({
        where: { resolved: false }
      }),
      tenantPrisma.client.device.count({
        where: { status: 'ONLINE' }
      })
    ]);

    return {
      userCount,
      deviceCount,
      alertCount,
      activeDevices,
    };
  });
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();
  const session = await getServerSession();
  const isSuperAdmin = sessionIsSuperAdmin(session);

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
        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <h3 className="text-3xl font-bold">{stats.userCount}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Devices</p>
              <h3 className="text-3xl font-bold">{stats.deviceCount}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <HardDrive className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Devices</p>
              <h3 className="text-3xl font-bold">{stats.activeDevices}</h3>
            </div>
            <div className="bg-teal-100 p-3 rounded-full">
              <Activity className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open Alerts</p>
              <h3 className="text-3xl font-bold">{stats.alertCount}</h3>
            </div>
            <div className="bg-amber-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <p className="text-gray-500 text-sm">
            Activity log will be displayed here.
          </p>
        </Card>

        <Card className="p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <p className="text-gray-500 text-sm">
            System health metrics will be displayed here.
          </p>
        </Card>
      </div>
    </div>
  );
}
