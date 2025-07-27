import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {GetDeviceQuery} from './get-device.query';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device-repository.interface';
import {Device} from '@/lib/device/domain/entities/device.entity';
import {DeviceNotFoundException} from '@/lib/device/domain/exceptions/device-not-found.exception';

/**
 * Handler for retrieving a single device by ID
 */
export class GetDeviceHandler implements CommandHandler<GetDeviceQuery, Device> {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  /**
   * Handles the get device query
   * @param query The get device query
   * @returns The device if found
   * @throws DeviceNotFoundException if the device is not found
   */
  async handle(query: GetDeviceQuery): Promise<Device> {
    // Find the device
    const device = await this.deviceRepository.findById(query.deviceId, query.getTenantContext());
    
    // Throw exception if device not found
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${query.deviceId.getValue()} not found`);
    }

    return device;
  }
}