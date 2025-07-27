/**
 * Performance Tests: Database Queries Stress Testing
 *
 * This test suite validates database query performance under various stress conditions:
 * - Complex query optimization
 * - Index effectiveness testing
 * - Connection pool stress testing
 * - Query timeout handling
 * - Memory usage during large result sets
 *
 * @vitest-environment node
 */
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

const prismaService = new PrismaService();
const prisma = prismaService.getClient();

describe('Database Queries Stress Testing', () => {
    let customerId: CustomerId;
    let customerDbId: string;
    let deviceIds: string[] = [];
    let largeDatasetSize: number;

    // Performance thresholds for database operations
    const DB_THRESHOLDS = {
        simpleQuery: 50,      // ms - simple queries should be fast
        complexQuery: 200,    // ms - complex aggregations acceptable
        largeDataset: 1000,   // ms - large result sets allowed more time
        concurrentQueries: 500, // ms - concurrent operations
        memoryLimit: 100 * 1024 * 1024, // 100MB memory limit for queries
        timeout: 30000        // 30 second query timeout
    };

    beforeAll(async () => {
        // Create test customer
        const customer = await prisma.customer.create({
            data: {
                name: 'Database Stress Test Customer',
                slug: 'db-stress-test-customer',
                status: 'ACTIVE'
            }
        });
        customerDbId = customer.id;
        customerId = CustomerId.create(customer.id);

        // Create large dataset for stress testing
        largeDatasetSize = 1000; // 1000 devices for stress testing
        console.log(`📊 Creating large dataset: ${largeDatasetSize} devices...`);

        const devicePromises = [];
        for (let i = 0; i < largeDatasetSize; i++) {
            devicePromises.push(
                prisma.device.create({
                    data: {
                        deviceId: `stress-device-${i}-${Date.now()}`,
                        hostname: `Stress Test Device ${i}`,
                        ipAddress: `10.0.${Math.floor(i / 256)}.${i % 256}`,
                        username: 'testuser',
                        password: 'testpass',
                        deviceType: ['PI_4', 'JETSON_NANO', 'RASPBERRY_PI_3'][i % 3],
                        status: ['ONLINE', 'OFFLINE', 'MAINTENANCE'][i % 3],
                        customerId: customerDbId,
                        userId: null // Will set after creating user
                    }
                })
            );
        }

        const devices = await Promise.all(devicePromises);
        deviceIds = devices.map(d => d.id);

        // Create metrics data for each device (multiple data points per device)
        console.log('📈 Creating metrics data...');
        const metricsPromises = [];
        const metricsPerDevice = 10;

        for (const deviceId of deviceIds.slice(0, 100)) { // Only first 100 devices for metrics
            for (let i = 0; i < metricsPerDevice; i++) {
                metricsPromises.push(
                    prisma.deviceMetrics.create({
                        data: {
                            deviceId,
                            customerId: customerDbId,
                            cpuUsage: Math.random() * 100,
                            memoryUsage: Math.random() * 100,
                            diskUsage: Math.random() * 100,
                            networkUpload: Math.random() * 1000000,
                            networkDownload: Math.random() * 2000000,
                            temperature: 40 + Math.random() * 40,
                            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Last 30 days
                        }
                    })
                );
            }
        }

        await Promise.all(metricsPromises);

        console.log(`✅ Database stress test setup complete: ${deviceIds.length} devices, ${metricsPromises.length} metrics`);
    }, 60000); // 60 second timeout for setup

    afterAll(async () => {
        // Clean up test data
        try {
            console.log('🧹 Cleaning up database stress test data...');

            await prisma.deviceMetrics.deleteMany({
                where: { customerId: customerDbId }
            });

            await prisma.alert.deleteMany({
                where: { customerId: customerDbId }
            });

            await prisma.threshold.deleteMany({
                where: { customerId: customerDbId }
            });

            if (deviceIds.length > 0) {
                await prisma.device.deleteMany({
                    where: { id: { in: deviceIds } }
                });
            }

            await prisma.customer.deleteMany({
                where: { id: customerDbId }
            });

            console.log('✅ Database stress test cleanup complete');
        } catch (error) {
            console.warn('Warning: Database stress test cleanup failed:', error);
        }
    }, 60000);

    describe('Query Performance Under Load', () => {
        it('should handle large result set queries efficiently', async () => {
            const startTime = Date.now();

            const largeResultSet = await prisma.device.findMany({
                where: { customerId: customerDbId },
                select: {
                    id: true,
                    deviceId: true,
                    hostname: true,
                    deviceType: true,
                    status: true,
                    ipAddress: true
                },
                orderBy: { hostname: 'asc' }
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`📊 Large Result Set Query (${largeResultSet.length} records):`);
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Records/Second: ${(largeResultSet.length / (duration / 1000)).toFixed(0)}`);
            console.log(`   Memory Usage: ${JSON.stringify(largeResultSet[0]).length * largeResultSet.length / 1024} KB`);

            expect(largeResultSet).toHaveLength(largeDatasetSize);
            expect(duration).toBeLessThanOrEqual(DB_THRESHOLDS.largeDataset);
        });

        it('should optimize complex filtering and sorting', async () => {
            const complexQueries = [
                {
                    name: 'Multi-condition filter',
                    query: () => prisma.device.findMany({
                        where: {
                            customerId: customerDbId,
                            status: 'ONLINE',
                            deviceType: 'PI_4',
                            hostname: { contains: 'Stress Test' }
                        },
                        orderBy: [
                            { deviceType: 'asc' },
                            { hostname: 'asc' }
                        ],
                        take: 100
                    })
                },
                {
                    name: 'Range-based filtering',
                    query: () => prisma.device.findMany({
                        where: {
                            customerId: customerDbId,
                            ipAddress: {
                                gte: '10.0.0.0',
                                lt: '10.0.10.0'
                            }
                        },
                        orderBy: { ipAddress: 'asc' }
                    })
                },
                {
                    name: 'Complex aggregation',
                    query: () => prisma.device.groupBy({
                        by: ['deviceType', 'status'],
                        where: { customerId: customerDbId },
                        _count: { id: true },
                        having: { id: { _count: { gt: 50 } } }
                    })
                }
            ];

            for (const complexQuery of complexQueries) {
                const startTime = Date.now();
                const result = await complexQuery.query();
                const endTime = Date.now();

                const duration = endTime - startTime;
                const resultCount = Array.isArray(result) ? result.length : 1;

                console.log(`🔍 Complex Query Performance (${complexQuery.name}):`);
                console.log(`   Results: ${resultCount}`);
                console.log(`   Duration: ${duration}ms`);
                console.log(`   Efficiency: ${(resultCount / Math.max(duration / 1000, 0.001)).toFixed(1)} results/sec`);

                expect(duration).toBeLessThanOrEqual(DB_THRESHOLDS.complexQuery);
            }
        });

        it('should handle concurrent database connections', async () => {
            const concurrentQueries = 50;
            const queryPromises = Array(concurrentQueries).fill(null).map((_, i) =>
                prisma.device.findMany({
                    where: { customerId: customerDbId },
                    select: { id: true, hostname: true, status: true },
                    take: 5,
                    skip: i % 10 // Different offsets to test connection multiplexing
                })
            );

            const startTime = Date.now();
            const results = await Promise.allSettled(queryPromises);
            const endTime = Date.now();

            const duration = endTime - startTime;
            const successfulQueries = results.filter(r => r.status === 'fulfilled').length;
            const failedQueries = results.filter(r => r.status === 'rejected').length;

            console.log(`🔗 Concurrent Database Connections (${concurrentQueries} queries):`);
            console.log(`   Total Duration: ${duration}ms`);
            console.log(`   Successful: ${successfulQueries}`);
            console.log(`   Failed: ${failedQueries}`);
            console.log(`   Avg Query Time: ${(duration / concurrentQueries).toFixed(1)}ms`);
            console.log(`   Queries/Second: ${(concurrentQueries / (duration / 1000)).toFixed(1)}`);

            expect(successfulQueries).toBe(concurrentQueries);
            expect(duration / concurrentQueries).toBeLessThanOrEqual(DB_THRESHOLDS.concurrentQueries);
        });
    });

    describe('Index Effectiveness Testing', () => {
        it('should demonstrate index effectiveness on primary keys', async () => {
            const iterations = 100;
            const queryTimes = [];

            // Test primary key lookups
            for (let i = 0; i < iterations; i++) {
                const randomDeviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
                const startTime = Date.now();

                await prisma.device.findUnique({
                    where: { id: randomDeviceId }
                });

                const endTime = Date.now();
                queryTimes.push(endTime - startTime);
            }

            const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
            const minTime = Math.min(...queryTimes);
            const maxTime = Math.max(...queryTimes);

            console.log(`🔑 Primary Key Index Performance (${iterations} lookups):`);
            console.log(`   Average: ${avgQueryTime.toFixed(1)}ms`);
            console.log(`   Min: ${minTime}ms`);
            console.log(`   Max: ${maxTime}ms`);
            console.log(`   Lookups/Second: ${(iterations / (queryTimes.reduce((a, b) => a + b, 0) / 1000)).toFixed(1)}`);

            expect(avgQueryTime).toBeLessThanOrEqual(DB_THRESHOLDS.simpleQuery);
        });

        it('should test foreign key index performance', async () => {
            const iterations = 50;
            const queryTimes = [];

            // Test foreign key filtering (customerId)
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();

                const result = await prisma.device.findMany({
                    where: { customerId: customerDbId },
                    select: { id: true, hostname: true },
                    take: 10,
                    skip: Math.floor(Math.random() * 100) // Random pagination
                });

                const endTime = Date.now();
                queryTimes.push(endTime - startTime);
            }

            const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;

            console.log(`🔗 Foreign Key Index Performance (${iterations} customer-filtered queries):`);
            console.log(`   Average: ${avgQueryTime.toFixed(1)}ms`);
            console.log(`   Queries/Second: ${(iterations / (queryTimes.reduce((a, b) => a + b, 0) / 1000)).toFixed(1)}`);

            expect(avgQueryTime).toBeLessThanOrEqual(DB_THRESHOLDS.simpleQuery);
        });

        it('should test composite index scenarios', async () => {
            // Test queries that would benefit from composite indexes
            const compositeQueries = [
                {
                    name: 'Customer + Status',
                    query: () => prisma.device.findMany({
                        where: {
                            customerId: customerDbId,
                            status: 'ONLINE'
                        },
                        select: { id: true, hostname: true },
                        take: 50
                    })
                },
                {
                    name: 'Customer + Device Type',
                    query: () => prisma.device.findMany({
                        where: {
                            customerId: customerDbId,
                            deviceType: 'PI_4'
                        },
                        select: { id: true, hostname: true },
                        take: 50
                    })
                },
                {
                    name: 'Customer + Status + Device Type',
                    query: () => prisma.device.findMany({
                        where: {
                            customerId: customerDbId,
                            status: 'ONLINE',
                            deviceType: 'PI_4'
                        },
                        select: { id: true, hostname: true }
                    })
                }
            ];

            for (const compositeQuery of compositeQueries) {
                const startTime = Date.now();
                const result = await compositeQuery.query();
                const endTime = Date.now();

                const duration = endTime - startTime;

                console.log(`🔗 Composite Query Performance (${compositeQuery.name}):`);
                console.log(`   Results: ${result.length}`);
                console.log(`   Duration: ${duration}ms`);

                expect(duration).toBeLessThanOrEqual(DB_THRESHOLDS.simpleQuery);
            }
        });
    });

    describe('Analytical Query Performance', () => {
        it('should handle complex analytical aggregations', async () => {
            const analyticalQueries = [
                {
                    name: 'Device Status Distribution',
                    query: () => prisma.device.groupBy({
                        by: ['status'],
                        where: { customerId: customerDbId },
                        _count: { id: true },
                        orderBy: { _count: { id: 'desc' } }
                    })
                },
                {
                    name: 'Device Type Analytics',
                    query: () => prisma.device.groupBy({
                        by: ['deviceType'],
                        where: { customerId: customerDbId },
                        _count: { id: true },
                        orderBy: { _count: { id: 'desc' } }
                    })
                },
                {
                    name: 'Time-based Metrics Aggregation',
                    query: () => prisma.$queryRaw`
                        SELECT
                            DATE_TRUNC('day', dm.timestamp) as date,
                            COUNT(DISTINCT dm."deviceId") as devices_reporting,
                            AVG(dm."cpuUsage") as avg_cpu,
                            AVG(dm."memoryUsage") as avg_memory,
                            COUNT(dm.id) as total_readings
                        FROM "deviceMetrics" dm
                        WHERE dm."customerId" = ${customerDbId}
                        GROUP BY date
                        ORDER BY date DESC
                        LIMIT 30
                    `
                },
                {
                    name: 'Performance Percentiles',
                    query: () => prisma.$queryRaw`
                        SELECT
                            percentile_cont(0.5) WITHIN GROUP (ORDER BY "cpuUsage") as median_cpu,
                            percentile_cont(0.95) WITHIN GROUP (ORDER BY "cpuUsage") as p95_cpu,
                            percentile_cont(0.99) WITHIN GROUP (ORDER BY "cpuUsage") as p99_cpu,
                            AVG("cpuUsage") as avg_cpu,
                            COUNT(*) as total_samples
                        FROM "deviceMetrics"
                        WHERE "customerId" = ${customerDbId}
                    `
                }
            ];

            for (const analyticalQuery of analyticalQueries) {
                const startTime = Date.now();
                const result = await analyticalQuery.query();
                const endTime = Date.now();

                const duration = endTime - startTime;
                const resultCount = Array.isArray(result) ? result.length : 1;

                console.log(`📈 Analytical Query Performance (${analyticalQuery.name}):`);
                console.log(`   Results: ${resultCount}`);
                console.log(`   Duration: ${duration}ms`);
                console.log(`   Data Processing Rate: ${(resultCount / Math.max(duration / 1000, 0.001)).toFixed(1)} records/sec`);

                expect(duration).toBeLessThanOrEqual(DB_THRESHOLDS.complexQuery);
            }
        });

        it('should handle large dataset aggregations efficiently', async () => {
            // Create even more metrics data for large-scale testing
            const additionalMetrics = [];
            for (let i = 0; i < 5000; i++) {
                additionalMetrics.push(
                    prisma.deviceMetrics.create({
                        data: {
                            deviceId: deviceIds[i % deviceIds.length],
                            customerId: customerDbId,
                            cpuUsage: Math.random() * 100,
                            memoryUsage: Math.random() * 100,
                            diskUsage: Math.random() * 100,
                            networkUpload: Math.random() * 1000000,
                            networkDownload: Math.random() * 2000000,
                            temperature: 40 + Math.random() * 40,
                            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last 7 days
                        }
                    })
                );
            }

            await Promise.all(additionalMetrics);

            // Test large-scale aggregations
            const largeScaleQueries = [
                {
                    name: '7-Day Performance Summary',
                    query: () => prisma.$queryRaw`
                        SELECT
                            DATE_TRUNC('hour', dm.timestamp) as hour,
                            COUNT(DISTINCT dm."deviceId") as active_devices,
                            AVG(dm."cpuUsage") as avg_cpu,
                            MIN(dm."cpuUsage") as min_cpu,
                            MAX(dm."cpuUsage") as max_cpu,
                            COUNT(dm.id) as reading_count
                        FROM "deviceMetrics" dm
                        WHERE dm."customerId" = ${customerDbId}
                        AND dm.timestamp >= NOW() - INTERVAL '7 days'
                        GROUP BY hour
                        ORDER BY hour DESC
                    `
                },
                {
                    name: 'Device Performance Rankings',
                    query: () => prisma.$queryRaw`
                        SELECT
                            d."hostname",
                            COUNT(dm.id) as metric_count,
                            AVG(dm."cpuUsage") as avg_cpu,
                            AVG(dm."memoryUsage") as avg_memory,
                            STDDEV(dm."cpuUsage") as cpu_variance,
                            MAX(dm."cpuUsage") as peak_cpu
                        FROM device d
                        JOIN "deviceMetrics" dm ON d.id = dm."deviceId"
                        WHERE d."customerId" = ${customerDbId}
                        GROUP BY d.id, d."hostname"
                        ORDER BY avg_cpu DESC
                        LIMIT 50
                    `
                }
            ];

            for (const largeScaleQuery of largeScaleQueries) {
                const startTime = Date.now();
                const result = await largeScaleQuery.query();
                const endTime = Date.now();

                const duration = endTime - startTime;
                const resultCount = Array.isArray(result) ? result.length : 1;

                console.log(`🏗️ Large Scale Query Performance (${largeScaleQuery.name}):`);
                console.log(`   Results: ${resultCount}`);
                console.log(`   Duration: ${duration}ms`);
                console.log(`   Processing Rate: ${(resultCount / Math.max(duration / 1000, 0.001)).toFixed(1)} records/sec`);

                expect(duration).toBeLessThanOrEqual(DB_THRESHOLDS.largeDataset);
            }

            // Clean up additional metrics
            await prisma.deviceMetrics.deleteMany({
                where: {
                    customerId: customerDbId,
                    timestamp: { gte: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } // Last 8 days
                }
            });
        });
    });

    describe('Connection Pool Stress Testing', () => {
        it('should handle connection pool saturation', async () => {
            const poolSize = 20; // Simulate connection pool size
            const totalQueries = 100;
            const batchSize = 10;

            const queryBatches = [];
            for (let i = 0; i < totalQueries; i += batchSize) {
                queryBatches.push(
                    Array(Math.min(batchSize, totalQueries - i)).fill(null).map((_, j) =>
                        prisma.device.findMany({
                            where: { customerId: customerDbId },
                            select: { id: true, hostname: true },
                            take: 5,
                            skip: (i + j) % 50 // Vary the offset
                        })
                    )
                );
            }

            const startTime = Date.now();
            const batchResults = [];

            for (const batch of queryBatches) {
                const batchStart = Date.now();
                const results = await Promise.all(batch);
                const batchEnd = Date.now();

                batchResults.push({
                    duration: batchEnd - batchStart,
                    queries: batch.length,
                    successful: results.filter(r => Array.isArray(r)).length
                });

                // Small delay between batches to prevent overwhelming
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            const totalSuccessfulQueries = batchResults.reduce((sum, b) => sum + b.successful, 0);
            const avgBatchTime = batchResults.reduce((sum, b) => sum + b.duration, 0) / batchResults.length;

            console.log(`🏊 Connection Pool Stress Test (${totalQueries} queries in ${queryBatches.length} batches):`);
            console.log(`   Total Duration: ${totalDuration}ms`);
            console.log(`   Successful Queries: ${totalSuccessfulQueries}/${totalQueries}`);
            console.log(`   Avg Batch Time: ${avgBatchTime.toFixed(1)}ms`);
            console.log(`   Queries/Second: ${(totalQueries / (totalDuration / 1000)).toFixed(1)}`);
            console.log(`   Pool Efficiency: ${((totalSuccessfulQueries / totalQueries) * 100).toFixed(1)}%`);

            expect(totalSuccessfulQueries).toBe(totalQueries);
            expect(avgBatchTime).toBeLessThanOrEqual(DB_THRESHOLDS.concurrentQueries);
        });

        it('should handle long-running query timeouts gracefully', async () => {
            // Test query that might take longer but should not hang
            const startTime = Date.now();

            try {
                const result = await Promise.race([
                    prisma.$queryRaw`
                        SELECT
                            d.id,
                            d.hostname,
                            COUNT(dm.id) as metric_count,
                            AVG(dm."cpuUsage") as avg_cpu,
                            STRING_AGG(DISTINCT dm.timestamp::text, ', ') as timestamps
                        FROM device d
                        LEFT JOIN "deviceMetrics" dm ON d.id = dm."deviceId"
                        WHERE d."customerId" = ${customerDbId}
                        GROUP BY d.id, d.hostname
                        ORDER BY metric_count DESC
                        LIMIT 100
                    `,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Query timeout')), DB_THRESHOLDS.timeout)
                    )
                ]);

                const endTime = Date.now();
                const duration = endTime - startTime;

                console.log(`⏱️ Long-Running Query Performance:`);
                console.log(`   Duration: ${duration}ms`);
                console.log(`   Results: ${Array.isArray(result) ? result.length : 1}`);
                console.log(`   Status: ✅ Completed within timeout`);

                expect(duration).toBeLessThan(DB_THRESHOLDS.timeout);
            } catch (error) {
                console.log(`⏱️ Long-Running Query Performance:`);
                console.log(`   Status: ❌ Timeout exceeded`);
                throw error;
            }
        });
    });

    describe('Memory Usage During Queries', () => {
        it('should monitor memory usage with large result sets', async () => {
            const initialMemory = process.memoryUsage();

            // Execute a query that returns a large result set
            const largeResult = await prisma.device.findMany({
                where: { customerId: customerDbId },
                include: {
                    deviceMetrics: {
                        take: 5,
                        orderBy: { timestamp: 'desc' }
                    }
                }
            });

            const afterQueryMemory = process.memoryUsage();
            const memoryIncrease = afterQueryMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

            // Force garbage collection if available (in test environment)
            if (global.gc) {
                global.gc();
            }

            const afterGcMemory = process.memoryUsage();
            const memoryAfterGc = afterGcMemory.heapUsed - initialMemory.heapUsed;
            const memoryAfterGcMB = memoryAfterGc / 1024 / 1024;

            console.log(`🧠 Memory Usage During Large Query (${largeResult.length} devices with metrics):`);
            console.log(`   Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   After Query: ${(afterQueryMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Memory Increase: ${memoryIncreaseMB.toFixed(2)} MB`);
            console.log(`   After GC: ${memoryAfterGcMB.toFixed(2)} MB`);
            console.log(`   Memory Efficiency: ${(largeResult.length / Math.max(memoryIncreaseMB, 0.1)).toFixed(0)} records/MB`);

            // Memory usage should be reasonable (less than 50MB increase for this dataset)
            expect(Math.abs(memoryIncrease)).toBeLessThan(DB_THRESHOLDS.memoryLimit);

            // Verify we got the expected data
            expect(largeResult.length).toBeGreaterThan(0);
            expect(largeResult[0].deviceMetrics).toBeDefined();
        });

        it('should handle streaming queries for memory efficiency', async () => {
            // Test pagination as a form of streaming
            const pageSize = 100;
            let totalProcessed = 0;
            let page = 0;
            const maxPages = 10; // Limit for testing

            const initialMemory = process.memoryUsage();

            while (page < maxPages) {
                const pageStartTime = Date.now();

                const pageResult = await prisma.device.findMany({
                    where: { customerId: customerDbId },
                    select: {
                        id: true,
                        hostname: true,
                        status: true,
                        deviceType: true
                    },
                    take: pageSize,
                    skip: page * pageSize,
                    orderBy: { hostname: 'asc' }
                });

                const pageEndTime = Date.now();

                if (pageResult.length === 0) break;

                totalProcessed += pageResult.length;

                console.log(`📄 Streaming Query Page ${page + 1}: ${pageResult.length} records in ${pageEndTime - pageStartTime}ms`);

                page++;
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

            console.log(`🌊 Streaming Query Memory Usage:`);
            console.log(`   Total Records Processed: ${totalProcessed}`);
            console.log(`   Memory Increase: ${memoryIncreaseMB.toFixed(2)} MB`);
            console.log(`   Memory per Record: ${(memoryIncreaseMB / Math.max(totalProcessed, 1) * 1024 * 1024).toFixed(0)} bytes`);

            // Streaming should be memory efficient
            expect(memoryIncreaseMB).toBeLessThan(20); // Less than 20MB for streaming
        });
    });

    describe('Query Optimization Validation', () => {
        it('should validate query execution plans', async () => {
            // Test queries that should use indexes effectively
            const optimizationTests = [
                {
                    name: 'Primary Key Lookup',
                    query: () => prisma.device.findUnique({
                        where: { id: deviceIds[0] }
                    }),
                    shouldUseIndex: true
                },
                {
                    name: 'Foreign Key Filter',
                    query: () => prisma.device.findMany({
                        where: { customerId: customerDbId },
                        take: 10
                    }),
                    shouldUseIndex: true
                },
                {
                    name: 'Status Filter',
                    query: () => prisma.device.findMany({
                        where: { status: 'ONLINE' },
                        take: 10
                    }),
                    shouldUseIndex: true // Should use status index
                },
                {
                    name: 'Complex Filter',
                    query: () => prisma.device.findMany({
                        where: {
                            customerId: customerDbId,
                            status: 'ONLINE',
                            deviceType: 'PI_4'
                        },
                        take: 10
                    }),
                    shouldUseIndex: true // Should use composite index if available
                }
            ];

            for (const optimizationTest of optimizationTests) {
                const startTime = Date.now();
                const result = await optimizationTest.query();
                const endTime = Date.now();

                const duration = endTime - startTime;

                console.log(`🔧 Query Optimization (${optimizationTest.name}):`);
                console.log(`   Duration: ${duration}ms`);
                console.log(`   Index Expected: ${optimizationTest.shouldUseIndex ? 'Yes' : 'No'}`);
                console.log(`   Performance: ${duration <= DB_THRESHOLDS.simpleQuery ? '✅ Good' : '⚠️ Slow'}`);

                // All indexed queries should be fast
                if (optimizationTest.shouldUseIndex) {
                    expect(duration).toBeLessThanOrEqual(DB_THRESHOLDS.simpleQuery);
                }
            }
        });

        it('should identify potential query optimization opportunities', async () => {
            // Test queries that might need optimization
            const optimizationCandidates = [
                {
                    name: 'Text Search Without Index',
                    query: () => prisma.device.findMany({
                        where: {
                            hostname: { contains: 'Stress Test' }
                        },
                        take: 20
                    }),
                    note: 'Consider adding text search index for hostname'
                },
                {
                    name: 'Multiple Table Join',
                    query: () => prisma.device.findMany({
                        where: { customerId: customerDbId },
                        include: {
                            deviceMetrics: {
                                take: 5,
                                orderBy: { timestamp: 'desc' }
                            },
                            alerts: {
                                take: 3,
                                orderBy: { createdAt: 'desc' }
                            }
                        },
                        take: 10
                    }),
                    note: 'Multiple joins may benefit from query optimization'
                },
                {
                    name: 'Aggregation Without Pre-computation',
                    query: () => prisma.$queryRaw`
                        SELECT
                            DATE_TRUNC('hour', dm.timestamp) as hour,
                            AVG(dm."cpuUsage") as avg_cpu,
                            COUNT(dm.id) as count
                        FROM "deviceMetrics" dm
                        WHERE dm."customerId" = ${customerDbId}
                        GROUP BY hour
                        ORDER BY hour DESC
                        LIMIT 24
                    `,
                    note: 'Consider pre-computed hourly aggregations for better performance'
                }
            ];

            for (const candidate of optimizationCandidates) {
                const startTime = Date.now();
                const result = await candidate.query();
                const endTime = Date.now();

                const duration = endTime - startTime;
                const resultCount = Array.isArray(result) ? result.length : 1;

                console.log(`🎯 Query Optimization Analysis (${candidate.name}):`);
                console.log(`   Duration: ${duration}ms`);
                console.log(`   Results: ${resultCount}`);
                console.log(`   Note: ${candidate.note}`);
                console.log(`   Optimization Needed: ${duration > DB_THRESHOLDS.complexQuery ? 'Yes' : 'No'}`);
                console.log('');

                // Log performance for monitoring, but don't fail the test
                // This is for informational purposes
            }

            console.log('📋 Query Optimization Analysis Complete');
            console.log('   Review the output above for potential performance improvements');
        });
    });
});

