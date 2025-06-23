import { vi } from 'vitest';
import { validateInfluxConfig, formatMetricsForInflux } from '@/lib/influxdb';

// Mock fetch globally
global.fetch = vi.fn();

describe('InfluxDB Unit Tests', () => {
    describe('formatMetricsForInflux', () => {
        it('should format device metrics correctly', () => {
            const deviceData = {
                device_id: 'test-device-123',
                cpu_usage: 75.5,
                cpu_temperature: 65.2,
                memory_usage_percent: 45.0,
                disk_usage_percent: 30.0
            };

            const timestamp = 1640995200000000000;
            const formatted = formatMetricsForInflux(deviceData, timestamp);

            expect(formatted).toContain('cpu_usage,device_id=test-device-123 value=75.5 1640995200000000000');
            expect(formatted).toContain('cpu_temperature,device_id=test-device-123 value=65.2 1640995200000000000');
            expect(formatted).toContain('memory_usage,device_id=test-device-123 value=45 1640995200000000000');
            expect(formatted).toContain('disk_usage,device_id=test-device-123 value=30 1640995200000000000');
        });

        it('should handle missing metrics gracefully', () => {
            const deviceData = {
                device_id: 'test-device-456',
                cpu_usage: 30.0
                // Missing other metrics
            };

            const timestamp = 1640995200000000000;
            const formatted = formatMetricsForInflux(deviceData, timestamp);

            expect(formatted).toContain('cpu_usage,device_id=test-device-456 value=30 1640995200000000000');
            expect(formatted).not.toContain('memory_usage');
            expect(formatted).not.toContain('cpu_temperature');
        });

        it('should escape special characters in device_id', () => {
            const deviceData = {
                device_id: 'test-device with spaces',
                cpu_usage: 25.0
            };

            const timestamp = 1640995200000000000;
            const formatted = formatMetricsForInflux(deviceData, timestamp);

            expect(formatted).toContain('cpu_usage,device_id=test-device\\ with\\ spaces value=25 1640995200000000000');
        });
    });

    describe('validateInfluxConfig', () => {
        it('should validate complete configuration', () => {
            const result = validateInfluxConfig();
            expect(result.isValid).toBe(true);
            expect(result.config).toEqual({
                url: 'http://localhost:8087',
                token: 'test-token',
                org: 'iotpilot',
                bucket: 'devices'
            });
        });

        it('should fail with missing URL', () => {
            delete process.env.INFLUXDB_URL;
            const result = validateInfluxConfig();
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('INFLUXDB_URL');
            
            // Restore for other tests
            process.env.INFLUXDB_URL = 'http://localhost:8087';
        });

        it('should fail with missing token', () => {
            delete process.env.INFLUXDB_TOKEN;
            const result = validateInfluxConfig();
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('INFLUXDB_TOKEN');
            
            // Restore for other tests
            process.env.INFLUXDB_TOKEN = 'test-token';
        });
    });
});
