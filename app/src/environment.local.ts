export const environment = {
  production: false,
  appIdentify: 1,

  // Main URLs - Dynamic based on access method
  baseUrl: 'https://iotpilotserver.test:9443',
  apiUrl: 'https://iotpilotserver.test:9443/api',
  wsUrl: 'wss://iotpilotserver.test:9443',

  // External Services - Local direct access
  grafanaUrl: 'http://iotpilotserver.test:3002',
  influxdbUrl: 'http://iotpilotserver.test:8087',

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