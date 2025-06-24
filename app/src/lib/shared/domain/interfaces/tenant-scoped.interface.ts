import { CustomerId } from '../../../../customer/domain/value-objects/customer-id.vo';

export interface ITenantScoped {
  getTenantId(): CustomerId;
}
