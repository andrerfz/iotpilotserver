export const environment = {
  production: true,
  appIdentify: 1,

  // Main URLs - READ FROM EXISTING ENV VARS
  baseUrl: process.env.DOMAIN_TUNEL ? `https://${process.env.DOMAIN_TUNEL}` : 'https://dashboard.iotpilot.app',
  apiUrl: process.env.DOMAIN_TUNEL ? `https://${process.env.DOMAIN_TUNEL}/api` : 'https://dashboard.iotpilot.app/api',
  wsUrl: process.env.DOMAIN_TUNEL ? `wss://${process.env.DOMAIN_TUNEL}` : 'wss://dashboard.iotpilot.app',

  // External Services - READ FROM EXISTING ENV VARS
  grafanaUrl: process.env.GRAFANA_DOMAIN ? `https://${process.env.GRAFANA_DOMAIN}` : 'https://dashboard-grafana.iotpilot.app',
  influxdbUrl: process.env.INFLUXDB_DOMAIN ? `https://${process.env.INFLUXDB_DOMAIN}` : 'https://dashboard-influxdb.iotpilot.app',

  // Network Configuration - READ FROM EXISTING ENV VARS
  cloudflareUrl: process.env.DOMAIN_TUNEL ? `https://${process.env.DOMAIN_TUNEL}` : undefined,
  grafanaCloudflareUrl: process.env.GRAFANA_DOMAIN ? `https://${process.env.GRAFANA_DOMAIN}` : undefined,
  influxdbCloudflareUrl: process.env.INFLUXDB_DOMAIN ? `https://${process.env.INFLUXDB_DOMAIN}` : undefined,
  tailscaleDomain: process.env.TAILSCALE_DOMAIN,

  // Rest of your config...
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