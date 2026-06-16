import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env['NODE_ENV'] === 'development';

const config: CapacitorConfig = {
  appId: 'com.iotpilot.app',
  appName: 'IoT Pilot',
  webDir: 'www',
  ...(isDev && {
    server: {
      url: process.env['CAP_DEV_URL'] ?? 'http://localhost:4201',
      cleartext: true,
    },
  }),
};

export default config;
