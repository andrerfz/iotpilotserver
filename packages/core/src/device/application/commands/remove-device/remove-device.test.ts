import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {RemoveDeviceCommand} from './remove-device.command';
import {RemoveDeviceHandler} from './remove-device.handler';
import {DeviceRemover} from '@iotpilot/core/device/domain/services/device-remover.service';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@iotpilot/core/device/domain/value-objects/device-name.vo';
import {DeviceStatus} from '@iotpilot/core/device/domain/value-objects/device-status.vo';
import {TenantContext, TenantContextImpl} from '@iotpilot/core/shared/domain/tenant-context';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {DeviceEntity} from '@iotpilot/core/device/domain/entities/device.entity';
import {DeviceRemovedEvent} from '@iotpilot/core/device/domain/events/device-removed.event';
import {DeviceNotFoundException} from '@iotpilot/core/device/domain/exceptions/device-not-found.exception';

describe('RemoveDeviceHandler', () => {
  let handler: RemoveDeviceHandler;
  let deviceRemover: DeviceRemover;
  let deviceRepository: DeviceRepository;
  let eventBus: EventBus;
  let tenantContext: TenantContext;
  let mockDevice: DeviceEntity;

  const CUSTOMER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(() => {
    deviceRemover = {
      removeDevice: vi.fn().mockResolvedValue(undefined)
    } as unknown as DeviceRemover;

    deviceRepository = {
      findById: vi.fn()
    } as unknown as DeviceRepository;

    eventBus = {
      publish: vi.fn().mockResolvedValue(undefined)
    } as unknown as EventBus;

    const customerId = CustomerId.create(CUSTOMER_UUID);
    const userId = UserId.fromString('user-123');
    const userRole = UserRole.create('USER');
    tenantContext = new TenantContextImpl(customerId, userId, userRole, false);

    mockDevice = DeviceEntity.create(
      DeviceId.fromString('device-123'),
      DeviceName.create('Test Device'),
      customerId,
      DeviceStatus.onlineAndActive()
    );

    (deviceRepository.findById as any).mockResolvedValue(mockDevice);

    handler = new RemoveDeviceHandler(deviceRemover, deviceRepository, eventBus);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should remove a device', async () => {
    const command = RemoveDeviceCommand.create(
      'device-123',
      CUSTOMER_UUID,
      tenantContext
    );

    await handler.handle(command);

    expect(deviceRepository.findById).toHaveBeenCalled();
    expect(deviceRemover.removeDevice).toHaveBeenCalled();
  });

  it('should publish a DeviceRemovedEvent', async () => {
    const command = RemoveDeviceCommand.create(
      'device-123',
      CUSTOMER_UUID,
      tenantContext
    );

    await handler.handle(command);

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(DeviceRemovedEvent)
    );
  });

  it('should throw an error if device is not found', async () => {
    (deviceRepository.findById as any).mockResolvedValue(null);

    const command = RemoveDeviceCommand.create(
      'non-existent-device',
      CUSTOMER_UUID,
      tenantContext
    );

    await expect(handler.handle(command)).rejects.toThrow(DeviceNotFoundException);
    expect(deviceRemover.removeDevice).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw an error if tenant context is missing', () => {
    expect(() => RemoveDeviceCommand.create(
      'device-123',
      CUSTOMER_UUID,
      undefined as any
    )).toThrow('Tenant context is required');
  });
});
