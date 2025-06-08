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
          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">SUPERADMIN</span>
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
          
          {/* SUPERADMIN-only sections */}
          {isSuperAdmin && (
            <>
              <li className="pt-4 pb-2 border-t border-blue-800 mt-4">
                <span className="text-xs uppercase text-blue-400 font-semibold">Platform Admin</span>
              </li>
              <li>
                <Link 
                  href="/admin/platform/customers" 
                  className={`flex items-center p-2 rounded-md ${isActive('/admin/platform/customers')}`}
                >
                  <BarChart className="mr-2 h-5 w-5" />
                  <span>Customer Management</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/platform/settings" 
                  className={`flex items-center p-2 rounded-md ${isActive('/admin/platform/settings')}`}
                >
                  <Settings className="mr-2 h-5 w-5" />
                  <span>Platform Settings</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/platform/security" 
                  className={`flex items-center p-2 rounded-md ${isActive('/admin/platform/security')}`}
                >
                  <Shield className="mr-2 h-5 w-5" />
                  <span>Security Audit</span>
                </Link>
              </li>
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