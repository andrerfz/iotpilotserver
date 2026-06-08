import {DomainEventBase} from '@iotpilot/core/shared/domain/events/domain.event';
import {CustomerId} from '../value-objects/customer-id.vo';
import {CustomerStatus, CustomerStatusType} from '../value-objects/customer-status.vo';

export class CustomerStatusChangedEvent extends DomainEventBase {
  constructor(
    public readonly customerId: CustomerId,
    public readonly previousStatus: CustomerStatusType,
    public readonly newStatus: CustomerStatus
  ) {
    super();
  }
}
