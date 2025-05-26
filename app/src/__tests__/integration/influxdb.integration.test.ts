import { InfluxDB, Point } from '@influxdata/influxdb-client';
import request from 'supertest';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import {
    isDevelopment,
    getBaseUrl
} from '@/lib/env';

const dev = isDevelopment();
const hostname = getBaseUrl();

describe('InfluxDB Integration Tests', () => {
    let influxDB: InfluxDB;
    let writeApi: any;
    let queryApi: any;
    let app: any;
    let server: any;

    const testConfig = {
        url: process.env.INFLUXDB_URL,
        token: process.env.INFLUXDB_TOKEN,
        org: process.env.INFLUXDB_ORG,
        bucket: process.env.INFLUXDB_BUCKET
    };

    beforeAll(async () => {
        // Skip if no InfluxDB configured
        if (!process.env.INFLUXDB_TOKEN) {
            console.warn('Skipping InfluxDB tests - INFLUXDB_TOKEN not set');
            return;
        }

        // Initialize InfluxDB client
        influxDB = new InfluxDB({
            url: testConfig.url,
            token: testConfig.token
        });

        writeApi = influxDB.getWriteApi(testConfig.org, testConfig.bucket);
        queryApi = influxDB.getQueryApi(testConfig.org);

        // Initialize Next.js app for API testing
        app = next({ dev, hostname });
        await app.prepare();

        const handle = app.getRequestHandler();
        server = createServer((req, res) => {
            const parsedUrl = parse(req.url!, true);
            handle(req, res, parsedUrl);
        });
    }, 30000);

    afterAll(async () => {
        if (writeApi) {
            await writeApi.close();
        }
        if (server) {
            server.close();
        }
    });

    describe('InfluxDB Connection', () => {
        it('should connect to InfluxDB successfully', async () => {
            if (!process.env.INFLUXDB_TOKEN) return;

            const response = await fetch(`${testConfig.url}/health`);
            expect(response.ok).toBe(true);
        });

        it('should be ready to accept requests', async () => {
            if (!process.env.INFLUXDB_TOKEN) return;

            const response = await fetch(`${testConfig.url}/api/v2/ready`);
            expect(response.ok).toBe(true);
        });
    });

    describe('InfluxDB Write Operations', () => {
        it('should write test data successfully', async () => {
            if (!process.env.INFLUXDB_TOKEN) return;

            const testPoint = new Point('test_metric')
                .tag('device_id', 'test-device-write')
                .floatField('value', 42.5)
                .timestamp(new Date());

            writeApi.writePoint(testPoint);
            await writeApi.flush();

            // Verify write by querying
            const query = `
        from(bucket:"${testConfig.bucket}")
        |> range(start: -1m)
        |> filter(fn: (r) => r._measurement == "test_metric")
        |> filter(fn: (r) => r.device_id == "test-device-write")
      `;

            const data: any[] = [];
            await new Promise((resolve, reject) => {
                queryApi.queryRows(query, {
                    next(row: string[], tableMeta: any) {
                        const o = tableMeta.toObject(row);
                        data.push(o);
                    },
                    error(error: Error) {
                        reject(error);
                    },
                    complete() {
                        resolve(data);
                    },
                });
            });

            expect(data.length).toBeGreaterThan(0);
            expect(data[0]._value).toBe(42.5);
        });

        it('should handle device metrics format', async () => {
            if (!process.env.INFLUXDB_TOKEN) return;

            const deviceMetrics = [
                new Point('cpu_usage').tag('device_id', 'test-device-metrics').floatField('value', 65.2),
                new Point('memory_usage').tag('device_id', 'test-device-metrics').floatField('value', 78.9),
                new Point('cpu_temperature').tag('device_id', 'test-device-metrics').floatField('value', 58.3)
            ];

            writeApi.writePoints(deviceMetrics);
            await writeApi.flush();

            // Verify all metrics were written
            const query = `
        from(bucket:"${testConfig.bucket}")
        |> range(start: -1m)
        |> filter(fn: (r) => r.device_id == "test-device-metrics")
        |> group(columns: ["_measurement"])
        |> count()
      `;

            const results: any[] = [];
            await new Promise((resolve, reject) => {
                queryApi.queryRows(query, {
                    next(row: string[], tableMeta: any) {
                        results.push(tableMeta.toObject(row));
                    },
                    error: reject,
                    complete: () => resolve(results),
                });
            });

            expect(results.length).toBe(3); // cpu_usage, memory_usage, cpu_temperature
        });
    });

    describe('Heartbeat API → InfluxDB Integration', () => {
        it('should write heartbeat data to InfluxDB via API', async () => {
            if (!process.env.INFLUXDB_TOKEN || !process.env.DEVICE_API_KEY) return;

            const testHeartbeat = {
                device_id: 'test-heartbeat-integration',
                hostname: 'test-device',
                cpu_usage: 45.7,
                cpu_temperature: 62.1,
                memory_usage_percent: 67.8,
                disk_usage_percent: 23.4,
                timestamp: new Date().toISOString()
            };

            // Mock the heartbeat endpoint
            const response = await request(server)
                .post('/api/heartbeat')
                .set('X-API-Key', process.env.DEVICE_API_KEY)
                .send(testHeartbeat)
                .expect(200);

            expect(response.body.status).toBe('success');

            // Wait for async InfluxDB write
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Verify data was written to InfluxDB
            const query = `
        from(bucket:"${testConfig.bucket}")
        |> range(start: -2m)
        |> filter(fn: (r) => r.device_id == "test-heartbeat-integration")
        |> filter(fn: (r) => r._measurement == "cpu_usage")
      `;

            const data: any[] = [];
            await new Promise((resolve, reject) => {
                queryApi.queryRows(query, {
                    next(row: string[], tableMeta: any) {
                        data.push(tableMeta.toObject(row));
                    },
                    error: reject,
                    complete: () => resolve(data),
                });
            });

            expect(data.length).toBeGreaterThan(0);
            expect(data[0]._value).toBe(45.7);
        }, 10000);
    });

    describe('InfluxDB Query Operations', () => {
        beforeAll(async () => {
            if (!process.env.INFLUXDB_TOKEN) return;

            // Seed test data
            const testPoints = [
                new Point('cpu_usage').tag('device_id', 'test-query-device').floatField('value', 25.5),
                new Point('cpu_usage').tag('device_id', 'test-query-device').floatField('value', 35.5),
                new Point('memory_usage').tag('device_id', 'test-query-device').floatField('value', 45.2)
            ];

            writeApi.writePoints(testPoints);
            await writeApi.flush();
            await new Promise(resolve => setTimeout(resolve, 1000));
        });

        it('should query device metrics correctly', async () => {
            if (!process.env.INFLUXDB_TOKEN) return;

            const query = `
        from(bucket:"${testConfig.bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r.device_id == "test-query-device")
        |> filter(fn: (r) => r._measurement == "cpu_usage")
      `;

            const results: any[] = [];
            await new Promise((resolve, reject) => {
                queryApi.queryRows(query, {
                    next(row: string[], tableMeta: any) {
                        results.push(tableMeta.toObject(row));
                    },
                    error: reject,
                    complete: () => resolve(results),
                });
            });

            expect(results.length).toBeGreaterThanOrEqual(2);
            expect(results.every(r => r.device_id === 'test-query-device')).toBe(true);
        });

        it('should aggregate metrics over time', async () => {
            if (!process.env.INFLUXDB_TOKEN) return;

            const query = `
        from(bucket:"${testConfig.bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r.device_id == "test-query-device")
        |> filter(fn: (r) => r._measurement == "cpu_usage")
        |> mean()
      `;

            const results: any[] = [];
            await new Promise((resolve, reject) => {
                queryApi.queryRows(query, {
                    next(row: string[], tableMeta: any) {
                        results.push(tableMeta.toObject(row));
                    },
                    error: reject,
                    complete: () => resolve(results),
                });
            });

            expect(results.length).toBe(1);
            expect(typeof results[0]._value).toBe('number');
            expect(results[0]._value).toBeCloseTo(30.5, 1); // Average of 25.5 and 35.5
        });
    });

    describe('Error Handling', () => {
        it('should handle connection failures gracefully', async () => {
            if (!process.env.INFLUXDB_TOKEN) return;

            const badInfluxDB = new InfluxDB({
                url: 'http://localhost:9999', // Non-existent port
                token: 'bad-token'
            });

            const badWriteApi = badInfluxDB.getWriteApi(testConfig.org, testConfig.bucket);
            const testPoint = new Point('test_metric').floatField('value', 1);

            badWriteApi.writePoint(testPoint);

            await expect(badWriteApi.flush()).rejects.toThrow();
        });

        it('should handle invalid queries', async () => {
            if (!process.env.INFLUXDB_TOKEN) return;

            const invalidQuery = 'invalid flux query syntax';

            await expect(new Promise((resolve, reject) => {
                queryApi.queryRows(invalidQuery, {
                    next: () => {},
                    error: reject,
                    complete: resolve,
                });
            })).rejects.toThrow();
        });
    });

    describe('Performance Tests', () => {
        it('should handle batch writes efficiently', async () => {
            if (!process.env.INFLUXDB_TOKEN) return;

            const batchSize = 100;
            const points = Array.from({ length: batchSize }, (_, i) =>
                new Point('performance_test')
                    .tag('device_id', 'perf-test-device')
                    .tag('batch', 'test-1')
                    .floatField('value', i)
                    .timestamp(new Date(Date.now() + i * 1000))
            );

            const startTime = Date.now();
            writeApi.writePoints(points);
            await writeApi.flush();
            const endTime = Date.now();

            const writeTime = endTime - startTime;
            expect(writeTime).toBeLessThan(5000); // Should complete within 5 seconds

            // Verify all points were written
            const query = `
        from(bucket:"${testConfig.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "performance_test")
        |> filter(fn: (r) => r.batch == "test-1")
        |> count()
      `;

            const results: any[] = [];
            await new Promise((resolve, reject) => {
                queryApi.queryRows(query, {
                    next(row: string[], tableMeta: any) {
                        results.push(tableMeta.toObject(row));
                    },
                    error: reject,
                    complete: () => resolve(results),
                });
            });

            expect(results[0]._value).toBe(batchSize);
        }, 15000);
    });

    afterEach(async () => {
        if (!process.env.INFLUXDB_TOKEN) return;

        // Cleanup test data
        try {
            const deleteQuery = `
        from(bucket:"${testConfig.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement =~ /^test.*/ or r.device_id =~ /^test.*/)
      `;

            // Note: Delete API requires different approach
            // For now, test data will naturally expire based on retention policy
        } catch (error) {
            console.warn('Cleanup failed:', error);
        }
    });
});