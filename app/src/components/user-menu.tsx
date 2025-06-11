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
    Button,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    DropdownSection,
    Avatar,
    Chip,
    Divider,
    Card,
    CardBody
} from '@heroui/react';
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

    // Environment configuration
    const envInfo = getEnvironmentInfo();
    const serviceUrls = getServiceUrls();
    const hasCloudFlare = !!getCloudFlareUrl();
    const hasTailscale = !!getTailscaleDomain();

    if (!user) return null;

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'danger';
            case 'USER': return 'primary';
            case 'READONLY': return 'default';
            default: return 'default';
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
        // Open in new tab
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <Dropdown placement="bottom-end" className="min-w-80">
            <DropdownTrigger>
                <Button
                    variant="ghost"
                    className="h-auto p-2 data-[hover=true]:bg-default-100"
                >
                    <div className="flex items-center gap-3">
                        <Avatar
                            size="sm"
                            src={user.profileImage}
                            className="bg-default-200 text-default-600"
                            fallback={<User className="w-4 h-4" />}
                        />
                        <div className="hidden md:block text-left">
                            <div className="text-sm font-medium">
                                {user.username}
                                {isDevelopment() && (
                                    <Chip size="sm" variant="flat" color="secondary" className="ml-1">
                                        {envInfo.name}
                                    </Chip>
                                )}
                            </div>
                            <div className="text-xs text-default-500">{user.email}</div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-default-400" />
                    </div>
                </Button>
            </DropdownTrigger>

            <DropdownMenu aria-label="User menu" className="w-80">
                {/* User Info */}
                <DropdownSection showDivider>
                    <DropdownItem
                        key="profile"
                        isReadOnly
                        className="h-auto gap-2 opacity-100 cursor-default"
                    >
                        <div className="flex items-center gap-3">
                            <Avatar
                                size="lg"
                                src={user.profileImage}
                                className="bg-default-200 text-default-600"
                                fallback={<User className="w-6 h-6" />}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                    {user.username}
                                </div>
                                <div className="text-xs text-default-500 truncate">
                                    {user.email}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <Chip
                                        size="sm"
                                        color={getRoleBadgeColor(user.role)}
                                        variant="flat"
                                        startContent={getRoleIcon(user.role)}
                                    >
                                        {user.role}
                                    </Chip>
                                    {isDevelopment() && (
                                        <Chip
                                            size="sm"
                                            color="success"
                                            variant="flat"
                                        >
                                            {envInfo.name.split('-')[0]}
                                        </Chip>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DropdownItem>
                </DropdownSection>

                {/* Stats */}
                {user._count && (
                    <DropdownSection showDivider>
                        <DropdownItem
                            key="stats"
                            isReadOnly
                            className="h-auto opacity-100 cursor-default"
                        >
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-lg font-semibold text-foreground">
                                        {user._count.devices}
                                    </div>
                                    <div className="text-xs text-default-500">Devices</div>
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-foreground">
                                        {user._count.alerts}
                                    </div>
                                    <div className="text-xs text-default-500">Alerts</div>
                                </div>
                            </div>
                        </DropdownItem>
                    </DropdownSection>
                )}

                {/* External Services */}
                <DropdownSection showDivider title="External Services">
                    {externalServices.filter(service => service.enabled).map((service) => (
                        <DropdownItem
                            key={service.name}
                            startContent={service.icon}
                            endContent={<ExternalLink className="w-3 h-3 text-default-400" />}
                            onPress={() => handleExternalLink(service.url, service.name)}
                            description={service.description}
                        >
                            {service.name}
                        </DropdownItem>
                    ))}

                    {externalServices.filter(service => service.enabled).length === 0 && (
                        <DropdownItem
                            key="no-services"
                            isReadOnly
                            className="opacity-50 cursor-default"
                        >
                            <div className="text-xs text-default-400 italic">
                                No external services available
                            </div>
                        </DropdownItem>
                    )}
                </DropdownSection>

                {/* Network Information */}
                <DropdownSection showDivider title="Network Status">
                    <DropdownItem
                        key="network-info"
                        isReadOnly
                        className="h-auto opacity-100 cursor-default"
                    >
                        <div className="space-y-2">
                            {networkInfo.filter(info => info.enabled && info.value).map((info) => (
                                <div key={info.name} className="flex items-start text-xs">
                                    <span className="text-default-400 mr-2 mt-0.5">{info.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-default-600">{info.name}:</div>
                                        <div className="text-foreground font-mono text-xs truncate">
                                            {info.value}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DropdownItem>
                </DropdownSection>

                {/* Environment Info (Development Only) */}
                {isDevelopment() && (
                    <DropdownSection showDivider title="Environment Info">
                        <DropdownItem
                            key="env-info"
                            isReadOnly
                            className="h-auto opacity-100 cursor-default"
                        >
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-default-600">Mode:</span>
                                    <span className="text-foreground">{envInfo.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-default-600">Features:</span>
                                    <span className="text-foreground">{envInfo.features.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-default-600">Access:</span>
                                    <Chip
                                        size="sm"
                                        color={typeof window !== 'undefined' && isCloudFlareAccess() ? 'primary' : 'success'}
                                        variant="flat"
                                    >
                                        {typeof window !== 'undefined' && isCloudFlareAccess() ? 'Tunnel' : 'Direct'}
                                    </Chip>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-default-600">Tailscale:</span>
                                    <Chip
                                        size="sm"
                                        color={hasTailscale ? 'success' : 'danger'}
                                        variant="flat"
                                    >
                                        {hasTailscale ? 'Active' : 'Inactive'}
                                    </Chip>
                                </div>
                            </div>
                        </DropdownItem>
                    </DropdownSection>
                )}

                {/* Menu Items */}
                <DropdownSection>
                    <DropdownItem
                        key="settings"
                        startContent={<Settings className="w-4 h-4" />}
                        onPress={() => {
                            // Navigate to profile/settings
                        }}
                    >
                        Settings
                    </DropdownItem>

                    {user.role === 'ADMIN' && (
                        <DropdownItem
                            key="admin"
                            startContent={<Shield className="w-4 h-4" />}
                            onPress={() => {
                                // Navigate to admin panel
                            }}
                        >
                            Admin Panel
                        </DropdownItem>
                    )}

                    {isDevelopment() && (
                        <DropdownItem
                            key="debug"
                            startContent={<Monitor className="w-4 h-4" />}
                            color="secondary"
                            onPress={() => {
                                console.log('Environment Info:', envInfo);
                                console.log('Service URLs:', serviceUrls);
                                console.log('User:', user);
                            }}
                        >
                            Debug Info
                        </DropdownItem>
                    )}

                    <DropdownItem
                        key="logout"
                        color="danger"
                        startContent={<LogOut className="w-4 h-4" />}
                        onPress={() => logout()}
                    >
                        Sign out
                    </DropdownItem>
                </DropdownSection>
            </DropdownMenu>
        </Dropdown>
    );
}