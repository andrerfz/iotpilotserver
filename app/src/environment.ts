export const environment = {
  production: true,
  appIdentify: 1,

  // Main URLs - Use NEXT_PUBLIC_ for client access
  baseUrl: process.env.NEXT_PUBLIC_DOMAIN_TUNEL
      ? `https://${process.env.NEXT_PUBLIC_DOMAIN_TUNEL}`
      : 'https://dashboard.iotpilot.app',

  apiUrl: process.env.NEXT_PUBLIC_DOMAIN_TUNEL
      ? `https://${process.env.NEXT_PUBLIC_DOMAIN_TUNEL}/api`
      : 'https://dashboard.iotpilot.app/api',

  wsUrl: process.env.NEXT_PUBLIC_DOMAIN_TUNEL
      ? `wss://${process.env.NEXT_PUBLIC_DOMAIN_TUNEL}`
      : 'wss://dashboard.iotpilot.app',

  // External Services - These should work now
  grafanaUrl: process.env.NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL
      ? `https://${process.env.NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL}`
      : 'https://dashboard-grafana.iotpilot.app',

  influxdbUrl: process.env.NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL
      ? `https://${process.env.NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL}`
      : 'https://dashboard-influxdb.iotpilot.app',

  // Network Configuration
  cloudflareUrl: process.env.NEXT_PUBLIC_DOMAIN_TUNEL
      ? `https://${process.env.NEXT_PUBLIC_DOMAIN_TUNEL}`
      : 'https://dashboard.iotpilot.app',

  grafanaCloudflareUrl: process.env.NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL
      ? `https://${process.env.NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL}`
      : 'https://dashboard-grafana.iotpilot.app',

  influxdbCloudflareUrl: process.env.NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL
      ? `https://${process.env.NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL}`
      : 'https://dashboard-influxdb.iotpilot.app',

  tailscaleDomain: process.env.NEXT_PUBLIC_TAILSCALE_DOMAIN,

  features: {
    sshTerminal: true,
    tailscaleIntegration: true,
    deviceCommands: true,
    realTimeUpdates: true,
    advancedMetrics: true,
  },

  timeouts: {
    api: 10000,
    websocket: 5000,
    deviceHeartbeat: 300000,
  },

  intervals: {
    deviceRefresh: 30000,
    metricsRefresh: 60000,
    alertsRefresh: 15000,
  },

  limits: {
    maxDevices: 1000,
    maxConcurrentSSH: 10,
    maxMetricsPoints: 1000,
  }
} as const;