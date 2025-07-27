import {CustomerEntity} from '../../domain/entities/customer.entity';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {CustomerName} from '../../domain/value-objects/customer-name.vo';
import {CustomerSlug} from '../../domain/value-objects/customer-slug.vo';
import {CustomerStatus} from '../../domain/value-objects/customer-status.vo';
import {OrganizationSettings} from '../../domain/value-objects/organization-settings.vo';
import {CustomerDto} from '../dto/customer.dto';

export class CustomerMapper {
  static toDomain(persistenceModel: any): CustomerEntity | null {
    if (!persistenceModel) {
      return null;
    }

    const id = CustomerId.fromString(persistenceModel.id);
    const name = CustomerName.create(persistenceModel.name);
    const slug = CustomerSlug.create(persistenceModel.slug || persistenceModel.name.toLowerCase().replace(/\s+/g, '-'));
    const status = CustomerStatus.fromString(persistenceModel.status || 'active');
    const settings = OrganizationSettings.default();

    const customer = CustomerEntity.create(id, name, slug, status, settings);

    // Update additional properties
    if (persistenceModel.contactEmail) {
      customer.updateContact(persistenceModel.contactEmail);
    }
    if (persistenceModel.description) {
      customer.updateDescription(persistenceModel.description);
    }
    if (persistenceModel.domain) {
      customer.updateDomain(persistenceModel.domain);
    }

    // Set timestamps
    customer.setTimestamps(
      new Date(persistenceModel.createdAt),
      new Date(persistenceModel.updatedAt),
      persistenceModel.deletedAt ? new Date(persistenceModel.deletedAt) : undefined
    );

    return customer;
  }

  static toPersistence(customer: CustomerEntity): Record<string, unknown> | null {
    if (!customer) {
      return null;
    }

    return {
      id: customer.getId().value,
      customerId: customer.customerId?.value,
      name: customer.name.getValue(),
      slug: customer.slug.getValue(),
      description: customer.description,
      contactEmail: customer.contactEmail,
      domain: customer.domain,
      status: customer.status.value,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      deletedAt: customer.deletedAt
    };
  }

  static toDto(customer: CustomerEntity): CustomerDto | null {
    if (!customer) {
      return null;
    }

    return {
      id: customer.getId().getValue(),
      customerId: customer.customerId?.getValue() || customer.getId().getValue(),
      name: customer.name.getValue(),
      description: customer.description,
      contactEmail: customer.contactEmail,
      status: customer.status.getValue(),
      isActive: customer.isActive,
      isDeleted: customer.isDeleted(),
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };
  }
}
