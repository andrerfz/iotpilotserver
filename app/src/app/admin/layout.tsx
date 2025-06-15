import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession, sessionIsAdmin, sessionIsSuperAdmin } from '@/lib/auth';
import AdminSidebar from '@/components/admin/admin-sidebar';

export const metadata = {
  title: 'Admin Panel - IoT Pilot',
  description: 'Admin panel for IoT Pilot platform',
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Get session and check if user is authenticated and has admin role
  const session = await getServerSession();

  if (!session) {
    redirect('/login?redirect=/admin');
  }

  // Check if user has admin role
  if (!sessionIsAdmin(session)) {
    redirect('/');
  }

  const isSuperAdmin = sessionIsSuperAdmin(session);

  return (
    <div className="flex h-full min-h-screen">
      <AdminSidebar isSuperAdmin={isSuperAdmin} />
      <div className="flex-1 p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
