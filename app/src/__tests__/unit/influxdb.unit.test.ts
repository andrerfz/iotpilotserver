import { sendToInfluxDB, formatMetricsForInflux, validateInfluxConfig } from '@/lib/influxdb';

// Mock fetch globally
global.fetch = jest.fn();

describe('InfluxDB Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset environment variables
        process.env.INFLUXDB_URL = 'http://localhost:8087';
        process.env.INFLUXDB_TOKEN = 'test-token';
        process.env.INFLUXDB_ORG = 'iotpilot';
        process.env.INFLUXDB_BUCKET = 'devices';
    });

    describe('formatMetricsForInflux', () => {
        it('should format device metrics correctly', () => {
            const deviceData = {
                device_id: 'test-device-123',
                cpu_usage: 45.7,
                cpu_temperature: 62.1,
                memory_usage_percent: 67.8,
                disk_usage_percent: 23.4
            };

            const timestamp = 1640995200000000000; // nanoseconds
            const formatted = formatMetricsForInflux(deviceData, timestamp);

            expect(formatted).toContain('cpu_usage,device_id=test-device-123 value=45.7 1640995200000000000');
            expect(formatted).toContain('cpu_temperature,device_id=test-device-123 value=62.1 1640995200000000000');
            expect(formatted).toContain('memory_usage,device_id=test-device-123 value=67.8 1640995200000000000');
            expect(formatted).toContain('disk_usage,device_id=test-device-123 value=23.4 1640995200000000000');
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
        });

        it('should fail with missing token', () => {
            delete process.env.INFLUXDB_TOKEN;
            const result = validateInfluxConfig();
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('INFLUXDB_TOKEN');
        });
    });

    describe('sendToInfluxDB', () => {
        const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

        it('should send metrics successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 204,
                statusText: 'No Content'
            } as Response);

            const deviceData = {
                device_id: 'test-device',
                cpu_usage: 50.0,
                memory_usage_percent: 60.0
            };

            await expect(sendToInfluxDB(deviceData)).resolves.not.toThrow();

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8087/api/v2/write?org=iotpilot&bucket=devices',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Authorization': 'Token test-token',
                        'Content-Type': 'text/plain'
                    },
                    body: expect.stringContaining('cpu_usage,device_id=test-device value=50'),
                    signal: expect.any(AbortSignal)
                })
            );
        });

        it('should handle HTTP errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            } as Response);

            const deviceData = { device_id: 'test', cpu_usage: 50.0 };

            // Should not throw but should log error
            await expect(sendToInfluxDB(deviceData)).resolves.not.toThrow();
        });

        it('should handle network timeouts', async () => {
            mockFetch.mockRejectedValueOnce(new Error('AbortError'));

            const deviceData = { device_id: 'test', cpu_usage: 50.0 };

            await expect(sendToInfluxDB(deviceData)).resolves.not.toThrow();
        });

        it('should skip when no metrics provided', async () => {
            const deviceData = { device_id: 'test' }; // No numeric metrics

            await sendToInfluxDB(deviceData);

            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should skip when InfluxDB not configured', async () => {
            delete process.env.INFLUXDB_URL;
            delete process.env.INFLUXDB_TOKEN;

            const deviceData = { device_id: 'test', cpu_usage: 50.0 };

            await sendToInfluxDB(deviceData);

            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe('Error resilience', () => {
        const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

        it('should handle malformed responses', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve('Invalid JSON')
            } as any);

            const deviceData = { device_id: 'test', cpu_usage: 50.0 };

            await expect(sendToInfluxDB(deviceData)).resolves.not.toThrow();
        });

        it('should handle network interruptions', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const deviceData = { device_id: 'test', cpu_usage: 50.0 };

            await expect(sendToInfluxDB(deviceData)).resolves.not.toThrow();
        });
    });
});