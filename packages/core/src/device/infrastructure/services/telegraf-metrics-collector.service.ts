import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceMetrics} from '@iotpilot/core/device/domain/entities/device-metrics.entity';
import {MetricsCollector} from '@iotpilot/core/device/domain/interfaces/metrics-collector.interface';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {HttpClient} from '@iotpilot/core/shared/domain/interfaces/http-client.interface';

// Define the structure of the metrics data returned by Telegraf
interface TelegrafMetricsData {
  cpu: number;
  memory: number;
  disk: number;
  network?: {
    upload: number;
    download: number;
  };
}

export class TelegrafMetricsCollectorService implements MetricsCollector {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly telegrafUrl: string,
    private readonly httpClient: HttpClient,
    private readonly deviceRepository?: DeviceRepository
  ) {}
  
  private get prisma() {
    return this.prismaService.getClient();
  }

  async collectMetrics(deviceId: DeviceId): Promise<DeviceMetrics> {
    try {
      // Get device information from the database
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId.getValue() }
      });

      if (!device) {
        throw new Error(`Device with ID ${deviceId.getValue()} not found`);
      }

      const customerId = device.customerId ? CustomerId.create(device.customerId) : CustomerId.create('unknown');

      // Query Telegraf API for metrics
      const response = await this.httpClient.get<TelegrafMetricsData>(`${this.telegrafUrl}/metrics/${device.ipAddress}`);
      const metricsData = response.data;

      // Create DeviceMetrics entity
      return DeviceMetrics.create({
        deviceId,
        customerId,
        cpuUsage: metricsData.cpu || 0,
        memoryUsage: metricsData.memory || 0,
        diskUsage: metricsData.disk || 0,
        networkRx: metricsData.network?.download || 0,
        networkTx: metricsData.network?.upload || 0,
        uptime: 0,
        loadAverage: [],
        temperature: undefined,
        collectedAt: new Date()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to collect metrics for device ${deviceId.getValue()}: ${errorMessage}`);
    }
  }

  async collectMetricsForAllDevices(): Promise<DeviceMetrics[]> {
    try {
      // Get all active devices
      const devices = await this.prisma.device.findMany({
        where: { status: 'ONLINE' }
      });

      // Collect metrics for each device
      const metricsPromises = devices.map((device: any) =>
        this.collectMetrics(DeviceId.fromString(device.id))
      );

      return await Promise.all(metricsPromises);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to collect metrics for all devices: ${errorMessage}`);
    }
  }

  async getLatestMetrics(deviceId: DeviceId): Promise<DeviceMetrics | null> {
    try {
      // Get device to retrieve customerId
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId.getValue() }
      });
      
      if (!device) {
        return null;
      }
      
      const customerId = device.customerId ? CustomerId.create(device.customerId) : CustomerId.create('unknown');

      // Get the latest metrics from the database for each metric type
      const latestCpuMetric = await this.prisma.deviceMetric.findFirst({
        where: { 
          deviceId: deviceId.getValue(),
          metric: 'cpu_usage'
        },
        orderBy: { timestamp: 'desc' }
      });

      const latestMemoryMetric = await this.prisma.deviceMetric.findFirst({
        where: { 
          deviceId: deviceId.getValue(),
          metric: 'memory_usage'
        },
        orderBy: { timestamp: 'desc' }
      });

      const latestDiskMetric = await this.prisma.deviceMetric.findFirst({
        where: { 
          deviceId: deviceId.getValue(),
          metric: 'disk_usage'
        },
        orderBy: { timestamp: 'desc' }
      });

      const latestNetworkUploadMetric = await this.prisma.deviceMetric.findFirst({
        where: { 
          deviceId: deviceId.getValue(),
          metric: 'network_upload'
        },
        orderBy: { timestamp: 'desc' }
      });

      const latestNetworkDownloadMetric = await this.prisma.deviceMetric.findFirst({
        where: { 
          deviceId: deviceId.getValue(),
          metric: 'network_download'
        },
        orderBy: { timestamp: 'desc' }
      });

      // If no metrics found, return null
      if (!latestCpuMetric && !latestMemoryMetric && !latestDiskMetric && 
          !latestNetworkUploadMetric && !latestNetworkDownloadMetric) {
        return null;
      }

      // Use the most recent timestamp from any metric
      const timestamps = [
        latestCpuMetric?.timestamp,
        latestMemoryMetric?.timestamp,
        latestDiskMetric?.timestamp,
        latestNetworkUploadMetric?.timestamp,
        latestNetworkDownloadMetric?.timestamp
      ].filter(Boolean) as Date[];

      const mostRecentTimestamp = timestamps.length > 0 
        ? new Date(Math.max(...timestamps.map(date => date.getTime())))
        : new Date();

      // Create DeviceMetrics entity with values or defaults
      return DeviceMetrics.create({
        deviceId,
        customerId,
        cpuUsage: latestCpuMetric?.value ?? 0,
        memoryUsage: latestMemoryMetric?.value ?? 0,
        diskUsage: latestDiskMetric?.value ?? 0,
        networkRx: latestNetworkDownloadMetric?.value ?? 0,
        networkTx: latestNetworkUploadMetric?.value ?? 0,
        uptime: 0,
        loadAverage: [],
        temperature: undefined,
        collectedAt: mostRecentTimestamp
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get latest metrics for device ${deviceId.getValue()}: ${errorMessage}`);
    }
  }

  async getMetricsHistory(
    deviceId: DeviceId,
    startDate: Date,
    endDate: Date
  ): Promise<DeviceMetrics[]> {
    try {
      // Get device to retrieve customerId
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId.getValue() }
      });
      
      if (!device) {
        return [];
      }
      
      const customerId = device.customerId ? CustomerId.create(device.customerId) : CustomerId.create('unknown');

      // Get all metrics within the time range
      const allMetrics = await this.prisma.deviceMetric.findMany({
        where: {
          deviceId: deviceId.getValue(),
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      // Group metrics by timestamp (rounded to the nearest minute to group related metrics)
      const metricsByTimestamp = new Map<string, {
        timestamp: Date,
        cpu?: number,
        memory?: number,
        disk?: number,
        networkUpload?: number,
        networkDownload?: number
      }>();

      for (const metric of allMetrics) {
        // Round to nearest minute to group related metrics
        const timestampKey = new Date(
          metric.timestamp.getFullYear(),
          metric.timestamp.getMonth(),
          metric.timestamp.getDate(),
          metric.timestamp.getHours(),
          metric.timestamp.getMinutes()
        ).toISOString();

        if (!metricsByTimestamp.has(timestampKey)) {
          metricsByTimestamp.set(timestampKey, { timestamp: metric.timestamp });
        }

        const entry = metricsByTimestamp.get(timestampKey)!;

        // Assign the value based on metric type
        switch (metric.metric) {
          case 'cpu_usage':
            entry.cpu = metric.value;
            break;
          case 'memory_usage':
            entry.memory = metric.value;
            break;
          case 'disk_usage':
            entry.disk = metric.value;
            break;
          case 'network_upload':
            entry.networkUpload = metric.value;
            break;
          case 'network_download':
            entry.networkDownload = metric.value;
            break;
        }
      }

      // Convert the grouped metrics to DeviceMetrics entities
      return Array.from(metricsByTimestamp.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(metricsData => 
          DeviceMetrics.create({
            deviceId,
            customerId,
            cpuUsage: metricsData.cpu ?? 0,
            memoryUsage: metricsData.memory ?? 0,
            diskUsage: metricsData.disk ?? 0,
            networkRx: metricsData.networkDownload ?? 0,
            networkTx: metricsData.networkUpload ?? 0,
            uptime: 0,
            loadAverage: [],
            temperature: undefined,
            collectedAt: metricsData.timestamp
          })
        );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get metrics history for device ${deviceId.getValue()}: ${errorMessage}`);
    }
  }

  async saveMetrics(metrics: DeviceMetrics): Promise<void> {
    try {
      // Save each metric type separately
      const timestamp = metrics.collectedAt;
      const deviceIdStr = metrics.deviceId.getValue();
      const baseId = `${deviceIdStr}-${timestamp.getTime()}`;

      // Create array of metric data objects
      const metricsData = [
        {
          id: `${baseId}-cpu`,
          deviceId: deviceIdStr,
          metric: 'cpu_usage',
          value: metrics.cpuUsage,
          unit: '%',
          timestamp: timestamp
        },
        {
          id: `${baseId}-memory`,
          deviceId: deviceIdStr,
          metric: 'memory_usage',
          value: metrics.memoryUsage,
          unit: '%',
          timestamp: timestamp
        },
        {
          id: `${baseId}-disk`,
          deviceId: deviceIdStr,
          metric: 'disk_usage',
          value: metrics.diskUsage,
          unit: 'MB',
          timestamp: timestamp
        },
        {
          id: `${baseId}-network-upload`,
          deviceId: deviceIdStr,
          metric: 'network_upload',
          value: metrics.networkTx,
          unit: 'MB',
          timestamp: timestamp
        },
        {
          id: `${baseId}-network-download`,
          deviceId: deviceIdStr,
          metric: 'network_download',
          value: metrics.networkRx,
          unit: 'MB',
          timestamp: timestamp
        }
      ];

      // Save all metrics in a transaction
      await this.prisma.$transaction(
        metricsData.map(data => 
          this.prisma.deviceMetric.create({ data })
        )
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save metrics for device ${metrics.deviceId.getValue()}: ${errorMessage}`);
    }
  }
}
