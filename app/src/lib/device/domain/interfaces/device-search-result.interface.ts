import {DeviceDto} from '../../infrastructure/dto/device.dto';

export interface DeviceSearchResult {
  devices: DeviceDto[];
  total: number;
  limit: number;
  offset: number;
}
