import {beforeEach, describe, expect, it} from 'vitest';
import {DeviceMetrics} from '@iotpilot/core/device/domain/entities/device-metrics.entity';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

describe('DeviceMetrics Entity', () => {
  let deviceId: DeviceId;
  let customerId: CustomerId;
  let deviceMetrics: DeviceMetrics;
  const cpuUsage = 25.5;
  const memoryUsage = 40.2;
  const diskUsage = 60.8;
  const networkRx = 15.3;
  const networkTx = 10.7;
  const uptime = 86400;
  const loadAverage = [1.5, 1.2, 0.9];
  const collectedAt = new Date('2023-01-01T12:00:00Z');

  beforeEach(() => {
    deviceId = DeviceId.fromString('device-123');
    customerId = CustomerId.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

    deviceMetrics = DeviceMetrics.create({
      deviceId,
      customerId,
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkRx,
      networkTx,
      uptime,
      loadAverage,
      collectedAt
    });
  });

  describe('create', () => {
    it('should create a new device metrics with the provided values', () => {
      expect(deviceMetrics.deviceId.getValue()).toBe('device-123');
      expect(deviceMetrics.cpuUsage).toBe(cpuUsage);
      expect(deviceMetrics.memoryUsage).toBe(memoryUsage);
      expect(deviceMetrics.diskUsage).toBe(diskUsage);
      expect(deviceMetrics.networkRx).toBe(networkRx);
      expect(deviceMetrics.networkTx).toBe(networkTx);
      expect(deviceMetrics.collectedAt).toBe(collectedAt);
    });

    it('should auto-generate an ID', () => {
      expect(deviceMetrics.getId()).toBeDefined();
      expect(deviceMetrics.getId().getValue()).toBeDefined();
    });
  });

  describe('getters', () => {
    it('should return the correct deviceId', () => {
      expect(deviceMetrics.deviceId.getValue()).toBe('device-123');
    });

    it('should return the correct cpuUsage', () => {
      expect(deviceMetrics.cpuUsage).toBe(cpuUsage);
    });

    it('should return the correct memoryUsage', () => {
      expect(deviceMetrics.memoryUsage).toBe(memoryUsage);
    });

    it('should return the correct diskUsage', () => {
      expect(deviceMetrics.diskUsage).toBe(diskUsage);
    });

    it('should return the correct networkRx', () => {
      expect(deviceMetrics.networkRx).toBe(networkRx);
    });

    it('should return the correct networkTx', () => {
      expect(deviceMetrics.networkTx).toBe(networkTx);
    });

    it('should return the correct collectedAt', () => {
      expect(deviceMetrics.collectedAt).toBe(collectedAt);
    });

    it('should return the correct uptime', () => {
      expect(deviceMetrics.uptime).toBe(uptime);
    });

    it('should return the correct loadAverage', () => {
      expect(deviceMetrics.loadAverage).toEqual(loadAverage);
    });
  });
});
