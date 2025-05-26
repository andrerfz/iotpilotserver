export const environment = {
  production: false,
  appIdentify: 1,

  // Main URLs - Dynamic based on access method
  baseUrl: 'https://iotpilotserver.test:9443',
  apiUrl: 'https://iotpilotserver.test:9443/api',
  wsUrl: 'wss://iotpilotserver.test:9443',

  // External Services - FIX: Use CloudFlare subdomains
  grafanaUrl: 'http://iotpilotserver.test:3002',
  influxdbUrl: 'http://iotpilotserver.test:8087',

  // Network Configuration - ADD THESE
  cloudflareUrl: 'https://dashboarddev.iotpilot.app',
  grafanaCloudflareUrl: 'https://dashboarddev-grafana.iotpilot.app',
  influxdbCloudflareUrl: 'https://dashboarddev-influxdb.iotpilot.app',
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