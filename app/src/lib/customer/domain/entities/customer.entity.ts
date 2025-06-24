import {Entity} from '@/lib/shared/domain/interfaces/entity.interface';
import {ITenantScoped} from '@/lib/shared/domain/interfaces/tenant-scoped.interface';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import {CustomerName} from '../value-objects/customer-name.vo';
import {CustomerStatus, CustomerStatusEnum} from '../value-objects/customer-status.vo';
import {OrganizationSettings} from '../value-objects/organization-settings.vo';
import {CustomerCreatedEvent} from '../events/customer-created.event';
import {CustomerStatusChangedEvent} from '../events/customer-status-changed.event';
import {CustomerSettingsUpdatedEvent} from '../events/customer-settings-updated.event';
import {CustomerInvalidStatusException} from '../exceptions/customer.exception';

export class Customer extends Entity<CustomerId> implements ITenantScoped {
  private constructor(
    id: CustomerId,
    private name: CustomerName,
    private status: CustomerStatus,
    private settings: OrganizationSettings,
    private createdAt: Date,
    private updatedAt: Date
  ) {
    super(id);
  }

  static create(
    id: CustomerId,
    name: CustomerName,
    settings: OrganizationSettings
  ): Customer {
    const now = new Date();
    const customer = new Customer(
      id,
      name,
      new CustomerStatus(CustomerStatusEnum.ACTIVE),
      settings,
      now,
      now
    );

    customer.addEvent(new CustomerCreatedEvent(id, name, settings));
    return customer;
  }


  getId(): CustomerId {
    return this.id;
  }

  getName(): CustomerName {
    return this.name;
  }

  getStatus(): CustomerStatus {
    return this.status;
  }

  getSettings(): OrganizationSettings {
    return this.settings;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  updateName(name: CustomerName): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  updateSettings(settings: OrganizationSettings): void {
    const previousSettings = this.settings;
    this.settings = settings;
    this.updatedAt = new Date();

    this.addEvent(new CustomerSettingsUpdatedEvent(this.id, previousSettings, settings));
  }

  deactivate(): void {
    if (this.status.isInactive()) {
      throw new CustomerInvalidStatusException('Customer is already inactive');
    }

    const previousStatus = this.status.getValue();
    this.status = new CustomerStatus(CustomerStatusEnum.INACTIVE);
    this.updatedAt = new Date();

    this.addEvent(new CustomerStatusChangedEvent(this.id, previousStatus, this.status));
  }

  reactivate(): void {
    if (this.status.isActive()) {
      throw new CustomerInvalidStatusException('Customer is already active');
    }

    const previousStatus = this.status.getValue();
    this.status = new CustomerStatus(CustomerStatusEnum.ACTIVE);
    this.updatedAt = new Date();

    this.addEvent(new CustomerStatusChangedEvent(this.id, previousStatus, this.status));
  }

  suspend(): void {
    if (this.status.isSuspended()) {
      throw new CustomerInvalidStatusException('Customer is already suspended');
    }

    const previousStatus = this.status.getValue();
    this.status = new CustomerStatus(CustomerStatusEnum.SUSPENDED);
    this.updatedAt = new Date();

    this.addEvent(new CustomerStatusChangedEvent(this.id, previousStatus, this.status));
  }

  isActive(): boolean {
    return this.status.isActive();
  }

  // Tenant scope implementation
  getTenantId(): CustomerId {
    return this.getId();
  }
}
