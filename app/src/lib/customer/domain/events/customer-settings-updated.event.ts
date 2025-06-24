import { DomainEventBase } from '@/lib/shared/domain/events/domain.event';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { OrganizationSettings } from '../value-objects/organization-settings.vo';

export class CustomerSettingsUpdatedEvent extends DomainEventBase {
  constructor(
    public readonly customerId: CustomerId,
    public readonly previousSettings: OrganizationSettings,
    public readonly newSettings: OrganizationSettings
  ) {
    super();
  }
}
