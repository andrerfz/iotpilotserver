import {AlertId} from '../value-objects/alert-id.vo';
import {TenantContext} from '../../../shared/domain/tenant-context';
import {AlertEntity} from '../entities/alert.entity';

export interface AlertRepository {
  findById(id: AlertId, tenantContext?: TenantContext): Promise<AlertEntity | null>;
  findActiveByDeviceAndType(deviceId: string, alertType: string, tenantContext?: TenantContext): Promise<AlertEntity[]>;
  save(alert: AlertEntity, tenantContext?: TenantContext): Promise<void>;
  create(alert: AlertEntity, tenantContext?: TenantContext): Promise<void>;
  findAll(criteria?: any, tenantContext?: TenantContext): Promise<AlertEntity[]>;
  findByDeviceId(deviceId: string, tenantContext?: TenantContext): Promise<AlertEntity[]>;
  updateStatus(id: AlertId, status: string, tenantContext?: TenantContext): Promise<void>;
  delete(id: AlertId, tenantContext?: TenantContext): Promise<void>;
}
