import {DeviceMetrics} from '../device-metrics.entity';

describe('DeviceMetrics Entity', () => {
  it('should create a device metrics entity with valid data', () => {
    const metrics = new DeviceMetrics(65, 30, { upload: '10Mbps', download: '20Mbps' });

    expect(metrics.cpuUsage).toBe(65);
    expect(metrics.memoryUsage).toBe(30);
    expect(metrics.networkStats).toEqual({ upload: '10Mbps', download: '20Mbps' });
  });
});