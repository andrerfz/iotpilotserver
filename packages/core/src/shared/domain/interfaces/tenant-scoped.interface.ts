import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export interface ITenantScoped {
  getTenantId(): CustomerId;
}
