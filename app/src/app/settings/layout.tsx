'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Bell, 
  Shield, 
  Settings as SettingsIcon, 
  ChevronRight 
} from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Profile',
      href: '/settings/profile',
      icon: User,
      description: 'Manage your personal information and preferences'
    },
    {
      name: 'Notifications',
      href: '/settings/notifications',
      icon: Bell,
      description: 'Configure how and when you receive notifications'
    },
    {
      name: 'Security',
      href: '/settings/security',
      icon: Shield,
      description: 'Manage your account security and authentication options'
    },
    {
      name: 'System',
      href: '/settings/system',
      icon: SettingsIcon,
      description: 'Customize your dashboard and system preferences'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.name}</span>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>
          
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Need help?</h3>
            <p className="text-sm text-muted-foreground mb-3">
              If you need assistance with your settings, please check our documentation or contact support.
            </p>
            <Link 
              href="/help" 
              className="text-sm text-primary hover:underline"
            >
              View documentation
            </Link>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 bg-card rounded-lg p-6 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}