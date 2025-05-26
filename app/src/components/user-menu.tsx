'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
    User,
    Settings,
    LogOut,
    Shield,
    ChevronDown,
    BarChart3,
    Database,
    Monitor,
    ExternalLink,
    Globe,
    Network
} from 'lucide-react';
import {
    getGrafanaUrl,
    getInfluxUrl,
    getBaseUrl,
    getCloudFlareUrl,
    getTailscaleDomain,
    isFeatureEnabled,
    isDevelopment,
    getEnvironmentInfo,
    getServiceUrls,
    isCloudFlareAccess
} from '@/lib/env';

export default function UserMenu() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Environment configuration
    const envInfo = getEnvironmentInfo();
    const serviceUrls = getServiceUrls();
    const hasCloudFlare = !!getCloudFlareUrl();
    const hasTailscale = !!getTailscaleDomain();

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    const getRoleBadgeColor = (role: string) => {
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
            default: return <User className="w-3 h-3" />;
        }
    };

    // External service links with new URL structure
    const externalServices = [
        {
            name: 'Grafana Dashboards',
            url: getGrafanaUrl(),
            icon: <BarChart3 className="w-4 h-4" />,
            description: isDevelopment()
                ? 'View monitoring dashboards (Direct Port)'
                : 'View monitoring dashboards (Subdomain)',
            enabled: isFeatureEnabled('advancedMetrics'),
        },
        {
            name: 'InfluxDB Admin',
            url: getInfluxUrl(),
            icon: <Database className="w-4 h-4" />,
            description: isDevelopment()
                ? 'Database administration (Direct Port)'
                : 'Database administration (Subdomain)',
            enabled: user.role === 'ADMIN',
        },
    ];

    // Network information with current URLs
    const networkInfo = [
        {
            name: 'Current Access',
            value: typeof window !== 'undefined' && isCloudFlareAccess()
                ? 'CloudFlare Tunnel'
                : 'Direct/Local',
            icon: <Globe className="w-4 h-4" />,
            enabled: true,
        },
        {
            name: 'Main Dashboard',
            value: serviceUrls.main,
            icon: <Monitor className="w-4 h-4" />,
            enabled: true,
        },
        {
            name: 'Grafana URL',
            value: serviceUrls.grafana,
            icon: <BarChart3 className="w-4 h-4" />,
            enabled: isFeatureEnabled('advancedMetrics'),
        },
        {
            name: 'InfluxDB URL',
            value: serviceUrls.influxdb,
            icon: <Database className="w-4 h-4" />,
            enabled: user.role === 'ADMIN',
        },
        {
            name: 'Tailscale Network',
            value: getTailscaleDomain(),
            icon: <Network className="w-4 h-4" />,
            enabled: hasTailscale && isFeatureEnabled('tailscaleIntegration'),
        },
    ];

    const handleExternalLink = (url: string, serviceName: string) => {
        // Close menu first
        setIsOpen(false);

        // Open in new tab
        window.open(url, '_blank', 'noopener,noreferrer');

        // Log access in development
        if (isDevelopment()) {
            console.log(`Opened ${serviceName}: ${url}`);
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-2"
            >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user.username.charAt(0).toUpperCase()}
          </span>
                </div>
                <div className="hidden md:block text-left">
                    <div className="text-sm font-medium">
                        {user.username}
                        {isDevelopment() && (
                            <span className="ml-1 text-xs text-blue-600">({envInfo.name})</span>
                        )}
                    </div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                        <div className="py-1">
                            {/* User Info */}
                            <div className="px-4 py-3 border-b border-gray-100">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                            {user.username}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                            {user.email}
                                        </div>
                                        <div className="mt-1 flex items-center space-x-2">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                            <span className="ml-1">{user.role}</span>
                        </span>
                                            {isDevelopment() && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {envInfo.name.split('-')[0]}
                          </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            {user._count && (
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <div className="text-lg font-semibold text-gray-900">
                                                {user._count.devices}
                                            </div>
                                            <div className="text-xs text-gray-500">Devices</div>
                                        </div>
                                        <div>
                                            <div className="text-lg font-semibold text-gray-900">
                                                {user._count.alerts}
                                            </div>
                                            <div className="text-xs text-gray-500">Alerts</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* External Services */}
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                    External Services
                                </h4>
                                <div className="space-y-1">
                                    {externalServices.filter(service => service.enabled).map((service) => (
                                        <button
                                            key={service.name}
                                            onClick={() => handleExternalLink(service.url, service.name)}
                                            className="flex items-center w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                                            title={service.url}
                                        >
                                            <span className="text-gray-400 mr-3">{service.icon}</span>
                                            <div className="flex-1 text-left">
                                                <div className="font-medium">{service.name}</div>
                                                <div className="text-xs text-gray-500">{service.description}</div>
                                            </div>
                                            <ExternalLink className="w-3 h-3 text-gray-400" />
                                        </button>
                                    ))}

                                    {externalServices.filter(service => service.enabled).length === 0 && (
                                        <div className="text-xs text-gray-400 italic py-2">
                                            No external services available
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Network Information */}
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                    Network Status
                                </h4>
                                <div className="space-y-2">
                                    {networkInfo.filter(info => info.enabled && info.value).map((info) => (
                                        <div key={info.name} className="flex items-start text-xs">
                                            <span className="text-gray-400 mr-2 mt-0.5">{info.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-gray-600">{info.name}:</div>
                                                <div className="text-gray-900 font-mono text-xs truncate">
                                                    {info.value}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Environment Info (Development Only) */}
                            {isDevelopment() && (
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                        Environment Info
                                    </h4>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Mode:</span>
                                            <span className="text-gray-900">{envInfo.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Features:</span>
                                            <span className="text-gray-900">{envInfo.features.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Access:</span>
                                            <span className={`${typeof window !== 'undefined' && isCloudFlareAccess() ? 'text-blue-600' : 'text-green-600'}`}>
                                                {typeof window !== 'undefined' && isCloudFlareAccess() ? 'Tunnel' : 'Direct'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Tailscale:</span>
                                            <span className={`${hasTailscale ? 'text-green-600' : 'text-red-600'}`}>
                                                {hasTailscale ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Menu Items */}
                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        // Navigate to profile/settings
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <Settings className="w-4 h-4 mr-3" />
                                    Settings
                                </button>

                                {user.role === 'ADMIN' && (
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            // Navigate to admin panel
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        <Shield className="w-4 h-4 mr-3" />
                                        Admin Panel
                                    </button>
                                )}

                                {isDevelopment() && (
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            console.log('Environment Info:', envInfo);
                                            console.log('Service URLs:', serviceUrls);
                                            console.log('User:', user);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                    >
                                        <Monitor className="w-4 h-4 mr-3" />
                                        Debug Info
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        logout();
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                    <LogOut className="w-4 h-4 mr-3" />
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}