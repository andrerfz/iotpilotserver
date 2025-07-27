import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {RemoveDeviceCommand} from './remove-device.command';
import {RemoveDeviceHandler} from './remove-device.handler';
import {DeviceRemover} from '@/lib/device/domain/services/device-remover.service';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device-repository.interface';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@/lib/device/domain/value-objects/device-name.vo';
import {IpAddress} from '@/lib/device/domain/value-objects/ip-address.vo';
import {DeviceStatus} from '@/lib/device/domain/value-objects/device-status.vo';
import {SshCredentials} from '@/lib/device/domain/value-objects/ssh-credentials.vo';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {UserRole} from '@/lib/shared/domain/value-objects/user-role.vo';
import {EventBus} from '@/lib/shared/application/bus/event.bus';
import {Device} from '@/lib/device/domain/entities/device.entity';
import {DeviceRemovedEvent} from '@/lib/device/domain/events/device-removed.event';
import {DeviceNotFoundException} from '@/lib/device/domain/exceptions/device-not-found.exception';

// Mock dependencies
vi.mock('@/lib/device/domain/services/device-remover.service');
vi.mock('@/lib/device/domain/interfaces/device-repository.interface');
vi.mock('@/lib/shared/application/bus/event.bus');
vi.mock('@/lib/device/domain/value-objects/device-id.vo', () => ({
  DeviceId: {
    create: vi.fn().mockImplementation((id) => ({ 
      getValue: () => id,
      equals: (other: any) => id === other.getValue()
    }))
  }
}));

describe('RemoveDeviceHandler', () => {
  let handler: RemoveDeviceHandler;
  let deviceRemover: DeviceRemover;
  let deviceRepository: DeviceRepository;
  let eventBus: EventBus;
  let tenantContext: TenantContext;
  let mockDevice: Device;

  beforeEach(() => {
    // Create mocks
    deviceRemover = {
      removeDevice: vi.fn()
    } as unknown as DeviceRemover;

    deviceRepository = {
      findById: vi.fn()
    } as unknown as DeviceRepository;

    eventBus = {
      publish: vi.fn()
    } as unknown as EventBus;

    // Create tenant context
    const customerId = CustomerId.create('customer-123');
    const userId = UserId.create('user-123');
    const userRole = UserRole.create('USER');
    tenantContext = new TenantContext(customerId, userId, userRole, false);

    // Create mock device
    mockDevice = {
      id: DeviceId.create('device-123'),
      name: DeviceName.create('Test Device'),
      ipAddress: IpAddress.create('192.168.1.1'),
      status: DeviceStatus.create('active'),
      sshCredentials: SshCredentials.create('user', 'pass', 22),
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as Device;

    // Setup repository mock
    (deviceRepository.findById as any).mockResolvedValue(mockDevice);

    // Setup remover mock
    (deviceRemover.removeDevice as any).mockResolvedValue(undefined);

    // Create handler
    handler = new RemoveDeviceHandler(deviceRemover, deviceRepository, eventBus);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should remove a device', async () => {
    // Arrange
    const command = RemoveDeviceCommand.create(
      'device-123',
      'customer-123',
      tenantContext
    );

    // Act
    await handler.handle(command);

    // Assert
    expect(deviceRepository.findById).toHaveBeenCalledWith(
      expect.objectContaining({ getValue: expect.any(Function) }),
      tenantContext
    );
    
    expect(deviceRemover.removeDevice).toHaveBeenCalledWith(
      expect.objectContaining({ getValue: expect.any(Function) }),
      tenantContext
    );
  });

  it('should publish a DeviceRemovedEvent', async () => {
    // Arrange
    const command = RemoveDeviceCommand.create(
      'device-123',
      'customer-123',
      tenantContext
    );

    // Act
    await handler.handle(command);

    // Assert
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(DeviceRemovedEvent)
    );
    
    const event = (eventBus.publish as any).mock.calls[0][0];
    expect(event.deviceId.getValue()).toBe('device-123');
    expect(event.deviceName.getValue()).toBe(mockDevice.name.getValue());
    expect(event.tenantId.getValue()).toBe(tenantContext.getCustomerId().getValue());
  });

  it('should throw an error if device is not found', async () => {
    // Arrange
    (deviceRepository.findById as any).mockResolvedValue(null);
    
    const command = RemoveDeviceCommand.create(
      'non-existent-device',
      'customer-123',
      tenantContext
    );

    // Act & Assert
    await expect(handler.handle(command)).rejects.toThrow(DeviceNotFoundException);
    expect(deviceRemover.removeDevice).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should throw an error if tenant context is missing', () => {
    // Act & Assert
    expect(() => RemoveDeviceCommand.create(
      'device-123',
      'customer-123',
      undefined as any
    )).toThrow('Tenant context is required');
  });
});