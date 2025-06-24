import { DomainEventBase } from '../../../../shared/domain/events/domain.event';
import { CustomerId } from '../value-objects/customer-id.vo';
import { CustomerStatus, CustomerStatusEnum } from '../value-objects/customer-status.vo';

export class CustomerStatusChangedEvent extends DomainEventBase {
  constructor(
    public readonly customerId: CustomerId,
    public readonly previousStatus: CustomerStatusEnum,
    public readonly newStatus: CustomerStatus
  ) {
    super();
  }
}