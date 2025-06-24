import { DomainEventBase } from '../../../../shared/domain/events/domain.event';
import { CustomerId } from '../value-objects/customer-id.vo';
import { CustomerName } from '../value-objects/customer-name.vo';
import { OrganizationSettings } from '../value-objects/organization-settings.vo';

export class CustomerCreatedEvent extends DomainEventBase {
  constructor(
    public readonly customerId: CustomerId,
    public readonly customerName: CustomerName,
    public readonly settings: OrganizationSettings
  ) {
    super();
  }
}