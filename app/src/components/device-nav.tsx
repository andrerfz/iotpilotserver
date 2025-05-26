'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Server,
    BarChart,
    Terminal,
    Settings,
    AlertTriangle,
    Clock,
    HardDrive,
    Wifi,
    WifiOff,
    Network,
    Activity,
    FileText,
    Shield,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    isFeatureEnabled,
    isDevelopment,
    getGrafanaUrl,
    getInfluxUrl,
    getEnvironmentInfo,
    getTailscaleDomain
} from '@/lib/env';

interface DeviceNavProps {
    deviceId: string;
    hostname: string;
    status: string;
    alertCount: number;
}

export default function DeviceNav({ deviceId, hostname, status, alertCount }: DeviceNavProps) {
    const pathname = usePathname();
    const [externalLinksExpanded, setExternalLinksExpanded] = useState(false);

    // Environment configuration
    const envInfo = getEnvironmentInfo();
    const hasTailscale = !!getTailscaleDomain();

    // Get status color based on device status
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ONLINE': return 'text-green-500';
            case 'OFFLINE': return 'text-red-500';
            case 'MAINTENANCE': return 'text-yellow-500';
            case 'ERROR': return 'text-red-600';
            default: return 'text-gray-400';
        }
    };

    // Get status icon based on device status
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ONLINE': return <Wifi className="w-5 h-5" />;
            case 'OFFLINE': return <WifiOff className="w-5 h-5" />;
            case 'MAINTENANCE': return <Clock className="w-5 h-5" />;
            case 'ERROR': return <AlertTriangle className="w-5 h-5" />;
            default: return <WifiOff className="w-5 h-5" />;
        }
    };

    // Core navigation items with feature flags
    const navItems = [
        {
            title: 'Overview',
            icon: <Server className="w-5 h-5" />,
            href: `/devices/${deviceId}`,
            exact: true,
            enabled: true,
            description: 'Device status and basic information'
        },
        {
            title: 'Metrics',
            icon: <BarChart className="w-5 h-5" />,
            href: `/devices/${deviceId}/metrics`,
            enabled: isFeatureEnabled('advancedMetrics'),
            description: 'Performance metrics and historical data',
            badge: isDevelopment() ? 'DEV' : undefined
        },
        {
            title: 'Terminal',
            icon: <Terminal className="w-5 h-5" />,
            href: `/devices/${deviceId}/terminal`,
            enabled: isFeatureEnabled('sshTerminal') && status === 'ONLINE',
            description: 'Remote SSH terminal access',
            badge: status !== 'ONLINE' ? 'OFFLINE' : undefined,
            badgeColor: status !== 'ONLINE' ? 'bg-red-100 text-red-800' : undefined
        },
        {
            title: 'Commands',
            icon: <Activity className="w-5 h-5" />,
            href: `/devices/${deviceId}/commands`,
            enabled: isFeatureEnabled('deviceCommands'),
            description: 'Execute remote commands',
            badge: isDevelopment() ? 'BETA' : undefined
        },
        {
            title: 'Storage',
            icon: <HardDrive className="w-5 h-5" />,
            href: `/devices/${deviceId}/storage`,
            enabled: true,
            description: 'File system and storage management'
        },
        {
            title: 'Logs',
            icon: <FileText className="w-5 h-5" />,
            href: `/devices/${deviceId}/logs`,
            enabled: isFeatureEnabled('advancedMetrics'),
            description: 'System and application logs'
        },
        {
            title: 'Network',
            icon: <Network className="w-5 h-5" />,
            href: `/devices/${deviceId}/network`,
            enabled: isFeatureEnabled('tailscaleIntegration') && hasTailscale,
            description: 'Network configuration and Tailscale status',
            badge: hasTailscale ? 'TS' : undefined,
            badgeColor: hasTailscale ? 'bg-blue-100 text-blue-800' : undefined
        },
        {
            title: 'Alerts',
            icon: <AlertTriangle className="w-5 h-5" />,
            href: `/devices/${deviceId}/alerts`,
            enabled: true,
            description: 'Device alerts and notifications',
            badge: alertCount > 0 ? alertCount : undefined,
            badgeColor: alertCount > 0 ? 'bg-red-100 text-red-800' : undefined
        },
        {
            title: 'Settings',
            icon: <Settings className="w-5 h-5" />,
            href: `/devices/${deviceId}/settings`,
            enabled: true,
            description: 'Device configuration and preferences'
        }
    ];

    // External service links
    const externalLinks = [
        {
            title: 'Grafana Dashboard',
            icon: <BarChart className="w-4 h-4" />,
            url: `${getGrafanaUrl()}/d/device-overview?var-device=${deviceId}`,
            enabled: isFeatureEnabled('advancedMetrics'),
            description: 'View detailed metrics in Grafana'
        },
        {
            title: 'InfluxDB Data',
            icon: <Activity className="w-4 h-4" />,
            url: `${getInfluxUrl()}/orgs/iotpilot/data-explorer?query=from(bucket:"devices")|>filter(fn:(r)=>r.device_id=="${deviceId}")`,
            enabled: isDevelopment(), // Only show in development
            description: 'Raw metrics data in InfluxDB'
        }
    ];

    // Filter enabled navigation items
    const enabledNavItems = navItems.filter(item => item.enabled);
    const enabledExternalLinks = externalLinks.filter(link => link.enabled);

    const handleExternalLink = (url: string, title: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');

        if (isDevelopment()) {
            console.log(`Opened external link: ${title} - ${url}`);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            {/* Device Header */}
            <div className="flex items-center mb-4 pb-4 border-b border-gray-100">
                <div className={cn("mr-3", getStatusColor(status))}>
                    {getStatusIcon(status)}
                </div>
                <div className="flex-1">
                    <div className="flex items-center">
                        <h2 className="font-semibold text-gray-800">{hostname}</h2>
                        {isDevelopment() && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {envInfo.name}
              </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">{deviceId}</p>
                    {hasTailscale && (
                        <p className="text-xs text-blue-600 flex items-center mt-1">
                            <Network className="w-3 h-3 mr-1" />
                            Tailscale connected
                        </p>
                    )}
                </div>
                <div className={cn("ml-auto px-2 py-1 rounded-full text-xs font-medium",
                    status === 'ONLINE' ? 'bg-green-100 text-green-800' :
                        status === 'OFFLINE' ? 'bg-red-100 text-red-800' :
                            status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                )}>
                    {status}
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="mb-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Device Navigation
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {enabledNavItems.map((item) => {
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center p-3 rounded-md text-sm font-medium transition-colors relative group",
                                    isActive
                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                                )}
                                title={item.description}
                            >
                                <span className={cn("mb-2", isActive ? "text-blue-700" : "text-gray-400 group-hover:text-gray-600")}>
                  {item.icon}
                </span>
                                <span className="text-center leading-tight">{item.title}</span>

                                {item.badge && (
                                    <span className={cn(
                                        "absolute -top-1 -right-1 text-xs px-1.5 py-0.5 rounded-full",
                                        item.badgeColor || "bg-blue-100 text-blue-800"
                                    )}>
                    {item.badge}
                  </span>
                                )}

                                {/* Tooltip for longer descriptions */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                        {item.description}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* External Links Section */}
            {enabledExternalLinks.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            External Services
                        </h3>
                        <button
                            onClick={() => setExternalLinksExpanded(!externalLinksExpanded)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            {externalLinksExpanded ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {externalLinksExpanded && (
                        <div className="space-y-2">
                            {enabledExternalLinks.map((link) => (
                                <button
                                    key={link.title}
                                    onClick={() => handleExternalLink(link.url, link.title)}
                                    className="flex items-center w-full p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200 hover:border-gray-300"
                                    title={link.description}
                                >
                                    <span className="text-gray-400 mr-3">{link.icon}</span>
                                    <div className="flex-1 text-left">
                                        <div className="font-medium">{link.title}</div>
                                        <div className="text-xs text-gray-500">{link.description}</div>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Feature Status (Development Only) */}
            {isDevelopment() && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Feature Status
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${isFeatureEnabled('sshTerminal') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-gray-600">SSH Terminal</span>
                        </div>
                        <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${isFeatureEnabled('deviceCommands') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-gray-600">Commands</span>
                        </div>
                        <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${isFeatureEnabled('advancedMetrics') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-gray-600">Metrics</span>
                        </div>
                        <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${isFeatureEnabled('tailscaleIntegration') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-gray-600">Tailscale</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Stats */}
            <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-lg font-semibold text-gray-900">
                            {enabledNavItems.length}
                        </div>
                        <div className="text-xs text-gray-500">Features</div>
                    </div>
                    <div>
                        <div className="text-lg font-semibold text-gray-900">
                            {alertCount}
                        </div>
                        <div className="text-xs text-gray-500">Alerts</div>
                    </div>
                    <div>
                        <div className="text-lg font-semibold text-gray-900">
                            {status === 'ONLINE' ? '✓' : '✗'}
                        </div>
                        <div className="text-xs text-gray-500">Status</div>
                    </div>
                </div>
            </div>
        </div>
    );
}