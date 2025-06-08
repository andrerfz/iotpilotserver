// app/src/environment.local.ts (Development)
export const environment = {
  production: false,
  appIdentify: 1,

  // Main URLs - Use NEXT_PUBLIC_ for client access
  baseUrl: process.env.NEXT_PUBLIC_DOMAIN_TUNEL
      ? `https://${process.env.NEXT_PUBLIC_DOMAIN_TUNEL}`
      : 'https://iotpilotserver.test:9443',

  apiUrl: process.env.NEXT_PUBLIC_DOMAIN_TUNEL
      ? `https://${process.env.NEXT_PUBLIC_DOMAIN_TUNEL}/api`
      : 'https://iotpilotserver.test:9443/api',

  wsUrl: process.env.NEXT_PUBLIC_DOMAIN_TUNEL
      ? `wss://${process.env.NEXT_PUBLIC_DOMAIN_TUNEL}`
      : 'wss://iotpilotserver.test:9443',

  // External Services - These should work now
  grafanaUrl: process.env.NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL
      ? `https://${process.env.NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL}`
      : 'http://localhost:3002',

  influxdbUrl: process.env.NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL
      ? `https://${process.env.NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL}`
      : 'http://localhost:8087',

  // Network Configuration
  cloudflareUrl: process.env.NEXT_PUBLIC_DOMAIN_TUNEL
      ? `https://${process.env.NEXT_PUBLIC_DOMAIN_TUNEL}`
      : 'https://dashboarddev.iotpilot.app',

  grafanaCloudflareUrl: process.env.NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL
      ? `https://${process.env.NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL}`
      : 'https://dashboarddev-grafana.iotpilot.app',

  influxdbCloudflareUrl: process.env.NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL
      ? `https://${process.env.NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL}`
      : 'https://dashboarddev-influxdb.iotpilot.app',

  tailscaleDomain: process.env.NEXT_PUBLIC_TAILSCALE_DOMAIN,

  features: {
    sshTerminal: true,
    tailscaleIntegration: true,
    deviceCommands: true,
    realTimeUpdates: true,
    advancedMetrics: true,
  },

  timeouts: {
    api: 30000,
    websocket: 10000,
    deviceHeartbeat: 600000,
  },

  intervals: {
    deviceRefresh: 10000,
    metricsRefresh: 30000,
    alertsRefresh: 5000,
  },

  limits: {
    maxDevices: 50,
    maxConcurrentSSH: 5,
    maxMetricsPoints: 500,
  }
} as const;