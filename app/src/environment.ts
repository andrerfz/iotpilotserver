export const environment = {
  production: true,
  appIdentify: 1,

  // Main URLs - CloudFlare Tunnel in production
  baseUrl: process.env.DOMAIN_TUNEL || 'https://dashboard.iotpilot.app',
  apiUrl: `${process.env.DOMAIN_TUNEL || 'https://dashboard.iotpilot.app'}/api`,
  wsUrl: `wss://${(process.env.DOMAIN_TUNEL || 'https://dashboard.iotpilot.app').replace('https://', '')}`,

  // External Services - Subdomains for production
  grafanaUrl: process.env.GRAFANA_DOMAIN || 'https://dashboard-grafana.iotpilot.app',
  influxdbUrl: process.env.INFLUXDB_DOMAIN || 'https://dashboard-influxdb.iotpilot.app',

  // Network Configuration
  cloudflareUrl: process.env.DOMAIN_TUNEL,
  grafanaCloudflareUrl: process.env.GRAFANA_DOMAIN || 'https://dashboard-grafana.iotpilot.app',
  influxdbCloudflareUrl: process.env.INFLUXDB_DOMAIN || 'https://dashboard-influxdb.iotpilot.app',
  tailscaleDomain: process.env.TAILSCALE_DOMAIN,

  // Feature Flags
  features: {
    sshTerminal: true,
    tailscaleIntegration: true,
    deviceCommands: true,
    realTimeUpdates: true,
    advancedMetrics: true,
  },

  // Timeouts (production values)
  timeouts: {
    api: 10000,           // 10 seconds
    websocket: 5000,      // 5 seconds
    deviceHeartbeat: 300000, // 5 minutes
  },

  // Polling Intervals
  intervals: {
    deviceRefresh: 30000,    // 30 seconds
    metricsRefresh: 60000,   // 1 minute
    alertsRefresh: 15000,    // 15 seconds
  },

  // Limits
  limits: {
    maxDevices: 1000,
    maxConcurrentSSH: 10,
    maxMetricsPoints: 1000,
  }
} as const;