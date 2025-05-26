'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { User, LogOut, Settings, Shield, ChevronDown } from 'lucide-react';

export default function UserHeader() {
    const { user, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    if (!user) return null;

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'bg-red-100 text-red-800';
            case 'USER': return 'bg-blue-100 text-blue-800';
            case 'READONLY': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'ADMIN': return <Shield className="w-3 h-3" />;
            case 'USER': return <User className="w-3 h-3" />;
            case 'READONLY': return <User className="w-3 h-3" />;
            default: return <User className="w-3 h-3" />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user.username}</p>
                    <div className="flex items-center space-x-1">
            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
              {getRoleIcon(user.role)}
                <span>{user.role}</span>
            </span>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {dropdownOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setDropdownOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                        <div className="p-4 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <div className="mt-2">
                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {getRoleIcon(user.role)}
                    <span>{user.role}</span>
                </span>
                            </div>
                            {user._count && (
                                <div className="mt-2 text-xs text-gray-500">
                                    <p>{user._count.devices} devices • {user._count.alerts} alerts</p>
                                </div>
                            )}
                        </div>

                        <div className="py-1">
                            <button
                                onClick={() => {
                                    setDropdownOpen(false);
                                    // Navigate to profile/settings
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Settings className="w-4 h-4 mr-3" />
                                Account Settings
                            </button>

                            <button
                                onClick={() => {
                                    setDropdownOpen(false);
                                    logout();
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                            >
                                <LogOut className="w-4 h-4 mr-3" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}