import {CustomerId} from '../value-objects/customer-id.vo';
import {CustomerName} from '../value-objects/customer-name.vo';
import {CustomerSlug} from '../value-objects/customer-slug.vo';
import {CustomerStatus} from '../value-objects/customer-status.vo';
import {OrganizationSettings} from '../value-objects/organization-settings.vo';
import {TenantScopedEntity} from '@/lib/shared/domain/tenant-scoped.entity';

export class CustomerEntity extends TenantScopedEntity<CustomerId> {
  private _name: CustomerName;
  private _slug: CustomerSlug;
  private _status: CustomerStatus;
  private _settings: OrganizationSettings;
  private _description?: string;
  private _contactEmail?: string;
  private _domain?: string;
  public createdAt: Date;
  public updatedAt: Date;
  public deletedAt?: Date;

  constructor(
    id: CustomerId,
    name: CustomerName,
    slug: CustomerSlug,
    status: CustomerStatus = CustomerStatus.active(),
    settings: OrganizationSettings = OrganizationSettings.default(),
    customerId: CustomerId | null = null
  ) {
    super(id, customerId ?? id); // Customer is its own tenant
    this._name = name;
    this._slug = slug;
    this._status = status;
    this._settings = settings;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static create(
    id: CustomerId, 
    name: CustomerName, 
    slug?: CustomerSlug,
    status?: CustomerStatus,
    settings?: OrganizationSettings
  ): CustomerEntity {
    return new CustomerEntity(
      id, 
      name, 
      slug ?? CustomerSlug.createFromName(name.getValue()),
      status ?? CustomerStatus.active(),
      settings ?? OrganizationSettings.default(),
      id
    );
  }

  // Getters
  get name(): CustomerName {
    return this._name;
  }

  get slug(): CustomerSlug {
    return this._slug;
  }

  get status(): CustomerStatus {
    return this._status;
  }

  get settings(): OrganizationSettings {
    return this._settings;
  }

  get description(): string | undefined {
    return this._description;
  }

  get contactEmail(): string | undefined {
    return this._contactEmail;
  }

  get domain(): string | undefined {
    return this._domain;
  }

  get isActive(): boolean {
    return this._status.isActive();
  }

  // Named getter methods for compatibility
  getName(): CustomerName {
    return this._name;
  }

  getSlug(): CustomerSlug {
    return this._slug;
  }

  getStatus(): CustomerStatus {
    return this._status;
  }

  getSettings(): OrganizationSettings {
    return this._settings;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getDeletedAt(): Date | undefined {
    return this.deletedAt;
  }

  isDeleted(): boolean {
    return !!this.deletedAt;
  }

  // Update methods
  updateName(newName: CustomerName): void {
    this._name = newName;
    this.updatedAt = new Date();
  }

  updateSlug(newSlug: CustomerSlug): void {
    this._slug = newSlug;
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: CustomerStatus): void {
    this._status = newStatus;
    this.updatedAt = new Date();
  }

  updateSettings(newSettings: OrganizationSettings): void {
    this._settings = newSettings;
    this.updatedAt = new Date();
  }

  updateContact(contactEmail?: string): void {
    this._contactEmail = contactEmail;
    this.updatedAt = new Date();
  }

  updateDescription(description?: string): void {
    this._description = description;
    this.updatedAt = new Date();
  }

  updateDomain(domain?: string): void {
    this._domain = domain;
    this.updatedAt = new Date();
  }

  activate(): void {
    this._status = CustomerStatus.active();
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this._status = CustomerStatus.inactive();
    this.updatedAt = new Date();
  }

  suspend(): void {
    this._status = CustomerStatus.suspended();
    this.updatedAt = new Date();
  }

  getId(): CustomerId {
    return this._entityId;
  }

  getAggregateId(): string {
    return this.getId().getValue();
  }

  // Set timestamps for hydration from persistence
  setTimestamps(createdAt: Date, updatedAt: Date, deletedAt?: Date): void {
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deletedAt = deletedAt;
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this.getId().getValue(),
      name: this._name.getValue(),
      slug: this._slug.getValue(),
      status: this._status.getValue(),
      description: this._description,
      contactEmail: this._contactEmail,
      domain: this._domain,
      settings: this._settings.toJSON(),
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt
    };
  }
}

// Export for compatibility
export type Customer = CustomerEntity;
