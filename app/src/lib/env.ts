// app/src/lib/env.ts
import { environment as prodEnvironment } from '../environment';
import { environment as devEnvironment } from '../environment.local';

// Type for environment configuration
type Environment = {
  production: boolean;
  appIdentify: number;
  baseUrl: string;
  apiUrl: string;
  wsUrl: string;
  grafanaUrl: string;
  influxdbUrl: string;
  cloudflareUrl?: string;
  grafanaCloudflareUrl?: string;
  influxdbCloudflareUrl?: string;
  tailscaleDomain?: string;
  features: {
    sshTerminal: boolean;
    tailscaleIntegration: boolean;
    deviceCommands: boolean;
    realTimeUpdates: boolean;
    advancedMetrics: boolean;
  };
  timeouts: {
    api: number;
    websocket: number;
    deviceHeartbeat: number;
  };
  intervals: {
    deviceRefresh: number;
    metricsRefresh: number;
    alertsRefresh: number;
  };
  limits: {
    maxDevices: number;
    maxConcurrentSSH: number;
    maxMetricsPoints: number;
  };
};

type FeatureKey = keyof Environment['features'];

// Detect current environment based on hostname and NODE_ENV
function getCurrentEnvironment(): Environment {
  const isProd = process.env.NODE_ENV === 'production';

  // Server-side: use NODE_ENV
  if (typeof window === 'undefined') {
    return isProd ? prodEnvironment : devEnvironment;
  }

  // Client-side: detect based on hostname
  const hostname = window.location.hostname;

  // If accessing via local development domain, use dev environment
  if (hostname === 'iotpilotserver.test' || hostname === 'localhost') {
    return devEnvironment;
  }

  // If accessing via CloudFlare tunnel or production domain, use appropriate environment
  if (hostname.includes('iotpilot.app')) {
    return isProd ? prodEnvironment : devEnvironment;
  }

  // Default fallback
  return isProd ? prodEnvironment : devEnvironment;
}

// Select appropriate environment
export const environment = getCurrentEnvironment();

// Dynamic URL builders that respect current origin
export function getApiUrl(endpoint?: string): string {
  if (typeof window !== 'undefined') {
    const baseUrl = `${window.location.origin}/api`;
    if (!endpoint) return baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }

  // Server-side fallback
  if (!endpoint) return environment.apiUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${environment.apiUrl}${cleanEndpoint}`;
}

export function getWebSocketUrl(endpoint?: string): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = `${protocol}//${window.location.host}`;
    if (!endpoint) return baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }

  // Server-side fallback
  if (!endpoint) return environment.wsUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${environment.wsUrl}${cleanEndpoint}`;
}

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return environment.baseUrl;
}

export function isCloudFlareAccess(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('iotpilot.app');
}

function getServiceUrl(localUrl: string, cloudflareUrl?: string): string {
  if (isCloudFlareAccess() && cloudflareUrl) {
    return cloudflareUrl;
  }
  return localUrl;
}

export function getGrafanaUrl(path?: string): string {
  const baseUrl = getServiceUrl(
      environment.grafanaUrl,
      environment.grafanaCloudflareUrl
  );

  if (!path) return baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export function getInfluxUrl(path?: string): string {
  const baseUrl = getServiceUrl(
      environment.influxdbUrl,
      environment.influxdbCloudflareUrl
  );

  if (!path) return baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

// Get all service URLs based on current access method
export function getServiceUrls() {
  return {
    main: getBaseUrl(),
    api: getApiUrl(),
    websocket: getWebSocketUrl(),
    grafana: getGrafanaUrl(),
    influxdb: getInfluxUrl(),
    cloudflare: getCloudFlareUrl(),
    tailscale: getTailscaleDomain(),
  };
}

// Environment Checks
export function isProduction(): boolean {
  return environment.production;
}

export function isDevelopment(): boolean {
  return !environment.production;
}

// Feature Flags
export function isFeatureEnabled(feature: FeatureKey): boolean {
  return environment.features[feature];
}

export function getFeatures() {
  return environment.features;
}

// Configuration Getters
export function getApiTimeout(): number {
  return environment.timeouts.api;
}

export function getWebSocketTimeout(): number {
  return environment.timeouts.websocket;
}

export function getDeviceHeartbeatTimeout(): number {
  return environment.timeouts.deviceHeartbeat;
}

export function getRefreshInterval(type: 'device' | 'metrics' | 'alerts'): number {
  switch (type) {
    case 'device': return environment.intervals.deviceRefresh;
    case 'metrics': return environment.intervals.metricsRefresh;
    case 'alerts': return environment.intervals.alertsRefresh;
    default: return 30000;
  }
}

export function getLimit(type: 'devices' | 'ssh' | 'metrics'): number {
  switch (type) {
    case 'devices': return environment.limits.maxDevices;
    case 'ssh': return environment.limits.maxConcurrentSSH;
    case 'metrics': return environment.limits.maxMetricsPoints;
    default: return 100;
  }
}

// Network Configuration
export function getCloudFlareUrl(): string | undefined {
  return environment.cloudflareUrl;
}

export function getTailscaleDomain(): string | undefined {
  return environment.tailscaleDomain;
}

// Fetch Configuration
export function getFetchConfig(options?: RequestInit): RequestInit {
  return {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };
}

// Development Helpers
export function getEnvironmentInfo() {
  const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'iotpilotserver.test';

  return {
    name: isProduction() ? 'production' : (isLocalDev ? 'local-development' : 'tunneled-development'),
    baseUrl: getBaseUrl(),
    serviceUrls: getServiceUrls(),
    features: Object.entries(environment.features)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature),
    cloudflare: !!environment.cloudflareUrl,
    tailscale: !!environment.tailscaleDomain,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
  };
}

// Export environment for direct access if needed
export { environment as env };