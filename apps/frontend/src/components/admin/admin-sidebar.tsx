'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Cpu,
  HardDrive,
  FileText,
  BarChart,
  Settings,
  Shield
} from 'lucide-react';
import { Chip } from '@/components/ui';

interface AdminSidebarProps {
  isSuperAdmin: boolean;
}

export default function AdminSidebar({ isSuperAdmin }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname?.startsWith(path) ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800';
  };

  return (
    <div className="w-64 bg-blue-900 text-white h-full min-h-screen">
      <div className="p-4 border-b border-blue-800">
        <h2 className="text-xl font-bold">Admin Panel</h2>
        {isSuperAdmin && (
          <Chip size="sm" color="danger" variant="solid" className="mt-1">SUPERADMIN</Chip>
        )}
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <Link
              href="/admin/users"
              className={`flex items-center p-2 rounded-md ${isActive('/admin/users')}`}
            >
              <Users className="mr-2 h-5 w-5" />
              <span>User Management</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/devices"
              className={`flex items-center p-2 rounded-md ${isActive('/admin/devices')}`}
            >
              <HardDrive className="mr-2 h-5 w-5" />
              <span>Device Management</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/system"
              className={`flex items-center p-2 rounded-md ${isActive('/admin/system')}`}
            >
              <Cpu className="mr-2 h-5 w-5" />
              <span>System Health</span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/logs"
              className={`flex items-center p-2 rounded-md ${isActive('/admin/logs')}`}
            >
              <FileText className="mr-2 h-5 w-5" />
              <span>Logs Viewer</span>
            </Link>
          </li>

          {isSuperAdmin && (
            <>
              <li className="pt-4 pb-2 border-t border-blue-800 mt-4">
                <span className="text-xs uppercase text-blue-400 font-semibold">Platform Admin</span>
              </li>
              {[
                { icon: BarChart, label: 'Customer Management' },
                { icon: Settings, label: 'Platform Settings' },
                { icon: Shield, label: 'Security Audit' },
              ].map(({ icon: Icon, label }) => (
                <li key={label}>
                  <div className="flex items-center p-2 rounded-md text-blue-400 opacity-50 cursor-not-allowed select-none">
                    <Icon className="mr-2 h-5 w-5" />
                    <span>{label}</span>
                    <Chip
                      size="sm"
                      variant="flat"
                      className="ml-auto bg-blue-800 text-blue-300"
                    >
                      Soon
                    </Chip>
                  </div>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t border-blue-800">
        <div className="text-sm text-blue-300">
          <p>IoT Pilot Admin</p>
          <p className="text-xs">{isSuperAdmin ? 'SUPERADMIN Mode' : 'Customer Admin'}</p>
        </div>
      </div>
    </div>
  );
}
