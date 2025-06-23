import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.INFLUXDB_URL = 'http://localhost:8087';
process.env.INFLUXDB_TOKEN = 'test-token';
process.env.INFLUXDB_ORG = 'iotpilot';
process.env.INFLUXDB_BUCKET = 'devices';
process.env.DEVICE_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

// Mock fetch globally (using vi instead of jest)
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};
