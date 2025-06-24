import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';

export interface ITenantScoped {
  getTenantId(): CustomerId;
}
