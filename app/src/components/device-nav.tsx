'use client';

import {useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
    Activity,
    AlertTriangle,
    BarChart,
    Clock,
    ExternalLink,
    FileText,
    HardDrive,
    Network,
    Server,
    Settings,
    Terminal,
    Wifi,
    WifiOff
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
    getEnvironmentInfo,
    getGrafanaUrl,
    getInfluxUrl,
    getTailscaleDomain,
    isDevelopment,
    isFeatureEnabled
} from '@/lib/env';
import {Badge, Button, Chip, Divider, Tooltip} from '@heroui/react';

interface DeviceNavProps {
    deviceId: string;
    hostname: string;
    status: string;
    alertCount: number;
}

export default function DeviceNav({
    deviceId,
    hostname,
    status,
    alertCount
}: DeviceNavProps) {
    const pathname = usePathname();
    const [externalLinksExpanded, setExternalLinksExpanded] = useState(false);

    // Environment configuration
    const envInfo = getEnvironmentInfo();
    const hasTailscale = !!getTailscaleDomain();

    // Get status color based on device status
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ONLINE':
                return 'text-success';
            case 'OFFLINE':
                return 'text-danger';
            case 'MAINTENANCE':
                return 'text-warning';
            case 'ERROR':
                return 'text-danger';
            default:
                return 'text-default-400';
        }
    };

    // Get status icon based on device status
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ONLINE':
                return <Wifi className="w-5 h-5"/>;
            case 'OFFLINE':
                return <WifiOff className="w-5 h-5"/>;
            case 'MAINTENANCE':
                return <Clock className="w-5 h-5"/>;
            case 'ERROR':
                return <AlertTriangle className="w-5 h-5"/>;
            default:
                return <WifiOff className="w-5 h-5"/>;
        }
    };

    // Core navigation items with feature flags
    const navItems = [
        {
            title: 'Overview',
            icon: <Server className="w-5 h-5"/>,
            href: `/devices/${deviceId}`,
            exact: true,
            enabled: true,
            description: 'Device status and basic information'
        },
        {
            title: 'Metrics',
            icon: <BarChart className="w-5 h-5"/>,
            href: `/devices/${deviceId}/metrics`,
            enabled: isFeatureEnabled('advancedMetrics'),
            description: 'Performance metrics and historical data',
            badge: isDevelopment() ? 'DEV' : undefined
        },
        {
            title: 'Terminal',
            icon: <Terminal className="w-5 h-5"/>,
            href: `/devices/${deviceId}/terminal`,
            enabled: isFeatureEnabled('sshTerminal') && status === 'ONLINE',
            description: 'Remote SSH terminal access',
            badge: status !== 'ONLINE' ? 'OFFLINE' : undefined,
            badgeColor: status !== 'ONLINE' ? 'danger' : undefined
        },
        {
            title: 'Commands',
            icon: <Activity className="w-5 h-5"/>,
            href: `/devices/${deviceId}/commands`,
            enabled: isFeatureEnabled('deviceCommands'),
            description: 'Execute remote commands',
            badge: isDevelopment() ? 'BETA' : undefined
        },
        {
            title: 'Storage',
            icon: <HardDrive className="w-5 h-5"/>,
            href: `/devices/${deviceId}/storage`,
            enabled: true,
            description: 'File system and storage management'
        },
        {
            title: 'Logs',
            icon: <FileText className="w-5 h-5"/>,
            href: `/devices/${deviceId}/logs`,
            enabled: isFeatureEnabled('advancedMetrics'),
            description: 'System and application logs'
        },
        {
            title: 'Network',
            icon: <Network className="w-5 h-5"/>,
            href: `/devices/${deviceId}/network`,
            enabled: isFeatureEnabled('tailscaleIntegration') && hasTailscale,
            description: 'Network configuration and Tailscale status',
            badge: hasTailscale ? 'TS' : undefined,
            badgeColor: hasTailscale ? 'primary' : undefined
        },
        {
            title: 'Alerts',
            icon: <AlertTriangle className="w-5 h-5"/>,
            href: `/devices/${deviceId}/alerts`,
            enabled: true,
            description: 'Device alerts and notifications',
            badge: alertCount > 0 ? alertCount : undefined,
            badgeColor: alertCount > 0 ? 'danger' : undefined
        },
        {
            title: 'Settings',
            icon: <Settings className="w-5 h-5"/>,
            href: `/devices/${deviceId}/settings`,
            enabled: true,
            description: 'Device configuration and preferences'
        }
    ];

    // External service links
    const externalLinks = [
        {
            title: 'Grafana Dashboard',
            icon: <BarChart className="w-4 h-4"/>,
            url: `${getGrafanaUrl()}/d/device-overview?var-device=${deviceId}`,
            enabled: isFeatureEnabled('advancedMetrics'),
            description: 'View detailed metrics in Grafana'
        },
        {
            title: 'InfluxDB Data',
            icon: <Activity className="w-4 h-4"/>,
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
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            {/* Device Header */}
            <div className="flex items-center mb-4">
                <div className={cn("mr-3", getStatusColor(status))}>
                    {getStatusIcon(status)}
                </div>
                <div className="flex-1">
                    <div className="flex items-center">
                        <h2 className="font-semibold text-foreground">{hostname}</h2>
                        {isDevelopment() && (
                            <Chip size="sm" color="primary" variant="flat" className="ml-2">
                                {envInfo.name}
                            </Chip>
                        )}
                    </div>
                    <p className="text-sm text-default-500">{deviceId}</p>
                    {hasTailscale && (
                        <p className="text-xs text-primary flex items-center mt-1">
                            <Network className="w-3 h-3 mr-1"/>
                            Tailscale connected
                        </p>
                    )}
                </div>
                <Chip
                    size="sm"
                    color={
                        status === 'ONLINE' ? 'success' :
                            status === 'OFFLINE' ? 'danger' :
                                status === 'MAINTENANCE' ? 'warning' : 'danger'
                    }
                    variant="flat"
                >
                    {status}
                </Chip>
            </div>

            <Divider className="mb-4"/>

            {/* Main Navigation */}
            <div className="mb-4">
                <h3 className="text-xs font-medium text-default-500 uppercase tracking-wide mb-3">
                    Device Navigation
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {enabledNavItems.map((item) => {
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname.startsWith(item.href);

                        return (
                            <Tooltip key={item.href} content={item.description}>
                                <Button
                                    as={Link}
                                    href={item.href}
                                    color={isActive ? "primary" : "default"}
                                    variant={isActive ? "flat" : "light"}
                                    className="flex flex-col h-auto py-3 min-w-0 relative"
                                    fullWidth
                                >
                                    <span className={cn("mb-2", isActive ? "text-primary" : "text-default-400")}>
                                        {item.icon}
                                    </span>
                                    <span className="text-center leading-tight text-sm">{item.title}</span>

                                    {item.badge && (
                                        <Badge
                                            color={(item.badgeColor as "default" | "success" | "primary" | "secondary" | "warning" | "danger" | undefined) || "primary"}
                                            variant="flat"
                                            className="absolute -top-1 -right-1"
                                            size="sm"
                                        >
                                            {item.badge}
                                        </Badge>
                                    )}
                                </Button>
                            </Tooltip>
                        );
                    })}
                </div>
            </div>

            {/* External Links Section */}
            {enabledExternalLinks.length > 0 && (
                <div>
                    <Divider className="mb-4"/>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-medium text-default-500 uppercase tracking-wide">
                            External Services
                        </h3>
                        <Button
                            size="sm"
                            variant="light"
                            color="primary"
                            onClick={() => setExternalLinksExpanded(!externalLinksExpanded)}
                        >
                            {externalLinksExpanded ? 'Hide' : 'Show'}
                        </Button>
                    </div>

                    {externalLinksExpanded && (
                        <div className="space-y-2">
                            {enabledExternalLinks.map((link) => (
                                <Button
                                    key={link.title}
                                    onClick={() => handleExternalLink(link.url, link.title)}
                                    variant="bordered"
                                    className="w-full justify-start"
                                    endContent={<ExternalLink className="w-3 h-3 text-default-400"/>}
                                    startContent={<span className="text-default-400">{link.icon}</span>}
                                >
                                    <div className="flex-1 text-left">
                                        <div className="font-medium">{link.title}</div>
                                        <div className="text-xs text-default-500">{link.description}</div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Feature Status (Development Only) */}
            {isDevelopment() && (
                <div>
                    <Divider className="my-4"/>
                    <h3 className="text-xs font-medium text-default-500 uppercase tracking-wide mb-2">
                        Feature Status
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center">
                            <Badge color={isFeatureEnabled('sshTerminal') ? "success" : "danger"} variant="flat"
                                   size="sm" className="mr-2 w-2 h-2 min-w-unit-2 p-0 rounded-full">{""}</Badge>
                            <span className="text-default-600">SSH Terminal</span>
                        </div>
                        <div className="flex items-center">
                            <Badge color={isFeatureEnabled('deviceCommands') ? "success" : "danger"} variant="flat"
                                   size="sm" className="mr-2 w-2 h-2 min-w-unit-2 p-0 rounded-full">{""}</Badge>
                            <span className="text-default-600">Commands</span>
                        </div>
                        <div className="flex items-center">
                            <Badge color={isFeatureEnabled('advancedMetrics') ? "success" : "danger"} variant="flat"
                                   size="sm" className="mr-2 w-2 h-2 min-w-unit-2 p-0 rounded-full">{""}</Badge>
                            <span className="text-default-600">Metrics</span>
                        </div>
                        <div className="flex items-center">
                            <Badge color={isFeatureEnabled('tailscaleIntegration') ? "success" : "danger"}
                                   variant="flat" size="sm"
                                   className="mr-2 w-2 h-2 min-w-unit-2 p-0 rounded-full">{""}</Badge>
                            <span className="text-default-600">Tailscale</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Stats */}
            <Divider className="my-4"/>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <div className="text-lg font-semibold text-foreground">
                        {enabledNavItems.length}
                    </div>
                    <div className="text-xs text-default-500">Features</div>
                </div>
                <div>
                    <div className="text-lg font-semibold text-foreground">
                        {alertCount}
                    </div>
                    <div className="text-xs text-default-500">Alerts</div>
                </div>
                <div>
                    <div className="text-lg font-semibold text-foreground">
                        {status === 'ONLINE' ? '✓' : '✗'}
                    </div>
                    <div className="text-xs text-default-500">Status</div>
                </div>
            </div>
        </div>
    );
}
