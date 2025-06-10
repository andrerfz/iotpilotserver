export const environment = {
  production: false,
  appIdentify: 1,

  // Main URLs - READ FROM EXISTING ENV VARS
  baseUrl: process.env.DOMAIN_TUNEL ? `https://${process.env.DOMAIN_TUNEL}` : 'https://iotpilotserver.test:9443',
  apiUrl: process.env.DOMAIN_TUNEL ? `https://${process.env.DOMAIN_TUNEL}/api` : 'https://iotpilotserver.test:9443/api',
  wsUrl: process.env.DOMAIN_TUNEL ? `wss://${process.env.DOMAIN_TUNEL}` : 'wss://iotpilotserver.test:9443',

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