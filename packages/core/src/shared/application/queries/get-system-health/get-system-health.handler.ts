import {QueryHandler} from '@iotpilot/core/shared/application/interfaces/query.interface';
import {GetSystemHealthQuery} from './get-system-health.query';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

type PrismaClient = ReturnType<PrismaService['getClient']>;

export interface SystemHealthResult {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    database: 'connected' | 'disconnected';
    devices: {
        total: number;
        online: number;
        offline: number;
    };
    memory: {
        used: number;
        total: number;
        external: number;
    };
    services: {
        influxdb: string;
        redis: string;
        grafana: string;
    };
}

/**
 * Handler for getting system health status
 */
export class GetSystemHealthHandler implements QueryHandler<GetSystemHealthQuery, SystemHealthResult> {
    private readonly prismaService: PrismaService;

    constructor(prismaService: PrismaService) {
        this.prismaService = prismaService;
    }

    private get prisma(): PrismaClient {
        return this.prismaService.getClient();
    }

    async handle(_query: GetSystemHealthQuery): Promise<SystemHealthResult> {
        try {
            // Check database connection
            await this.prisma.$queryRaw`SELECT 1`;

            // Get device statistics
            const deviceCount = await this.prisma.device.count();
            const onlineDevices = await this.prisma.device.count({
                where: {
                    status: 'ONLINE',
                    lastSeen: {
                        gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
                    }
                }
            });

            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();

            // Check external services
            const [influxStatus, redisStatus, grafanaStatus] = await Promise.all([
                this.checkInfluxDB(),
                this.checkRedis(),
                this.checkGrafana()
            ]);

            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: Math.floor(uptime),
                version: process.env.npm_package_version || '1.0.0',
                database: 'connected',
                devices: {
                    total: deviceCount,
                    online: onlineDevices,
                    offline: deviceCount - onlineDevices
                },
                memory: {
                    used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    external: Math.round(memoryUsage.external / 1024 / 1024)
                },
                services: {
                    influxdb: influxStatus,
                    redis: redisStatus,
                    grafana: grafanaStatus
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime()),
                version: process.env.npm_package_version || '1.0.0',
                database: 'disconnected',
                devices: { total: 0, online: 0, offline: 0 },
                memory: { used: 0, total: 0, external: 0 },
                services: { influxdb: 'unknown', redis: 'unknown', grafana: 'unknown' }
            };
        }
    }

    private async checkInfluxDB(): Promise<string> {
        try {
            const influxUrl = process.env.INFLUXDB_URL;
            if (!influxUrl) return 'not_configured';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${influxUrl}/health`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok ? 'healthy' : 'unhealthy';
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return 'timeout';
            }
            return 'unreachable';
        }
    }

    private async checkRedis(): Promise<string> {
        try {
            // Placeholder - could use ioredis for actual check
            return 'healthy';
        } catch {
            return 'unreachable';
        }
    }

    private async checkGrafana(): Promise<string> {
        try {
            const grafanaUrl = process.env.GRAFANA_URL;
            if (!grafanaUrl) return 'not_configured';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${grafanaUrl}/api/health`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok ? 'healthy' : 'unhealthy';
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return 'timeout';
            }
            return 'unreachable';
        }
    }
}

