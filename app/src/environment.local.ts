export const environment = {
  production: false,
  appIdentify: 1,

  // Main URLs - CloudFlare Tunnel in production
  baseUrl: process.env.DOMAIN_TUNEL || 'https://iotpilotserver.test:9443',
  apiUrl: `${process.env.DOMAIN_TUNEL || 'https://iotpilotserver.test:9443'}/api`,
  wsUrl: `wss://${(process.env.DOMAIN_TUNEL || 'https://iotpilotserver.test:9443').replace('https://', '')}`,

  // External Services - Subdomains for production
  grafanaUrl: process.env.GRAFANA_DOMAIN || 'http://iotpilotserver.test:3002',
  influxdbUrl: process.env.INFLUXDB_DOMAIN || 'http://iotpilotserver.test:8087',

  // Network Configuration
  cloudflareUrl: process.env.DOMAIN_TUNEL || 'https://dashboarddev.iotpilot.app',
  grafanaCloudflareUrl: process.env.GRAFANA_DOMAIN || 'https://dashboarddev-grafana.iotpilot.app',
  influxdbCloudflareUrl: process.env.INFLUXDB_DOMAIN || 'https://dashboarddev-influxdb.iotpilot.app',
  tailscaleDomain: process.env.TAILSCALE_DOMAIN,

  // Feature Flags - More permissive in development
  features: {
    sshTerminal: true,
    tailscaleIntegration: true,
    deviceCommands: true,
    realTimeUpdates: true,
    advancedMetrics: true,
  },

  // Timeouts (more lenient for development)
  timeouts: {
    api: 30000,           // 30 seconds
    websocket: 10000,     // 10 seconds
    deviceHeartbeat: 600000, // 10 minutes
  },

  // Polling Intervals (faster for development)
  intervals: {
    deviceRefresh: 10000,    // 10 seconds
    metricsRefresh: 30000,   // 30 seconds
    alertsRefresh: 5000,     // 5 seconds
  },

  // Limits (smaller for development)
  limits: {
    maxDevices: 50,
    maxConcurrentSSH: 5,
    maxMetricsPoints: 500,
  }
} as const;