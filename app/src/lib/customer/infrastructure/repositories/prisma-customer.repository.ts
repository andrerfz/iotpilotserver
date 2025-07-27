import {CustomerEntity} from '@/lib/customer/domain/entities/customer.entity';
import {CustomerId} from '@/lib/customer/domain/value-objects/customer-id.vo';
import {CustomerName} from '@/lib/customer/domain/value-objects/customer-name.vo';
import {CustomerSlug} from '@/lib/customer/domain/value-objects/customer-slug.vo';
import {CustomerStatus} from '@/lib/customer/domain/value-objects/customer-status.vo';
import {OrganizationSettings} from '@/lib/customer/domain/value-objects/organization-settings.vo';
import {CustomerRepository} from '@/lib/customer/domain/interfaces/customer.repository';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';

type PrismaClient = ReturnType<PrismaService['getClient']>;

// Get Prisma types from the client
type PrismaCustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

type PrismaCustomer = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: PrismaCustomerStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

/**
 * Prisma-backed CustomerRepository implementation.
 *
 * Note: Customer is a special case in this codebase (tenant root). We enforce access rules
 * here to avoid leaking tenant boundary checks into the composition root.
 */
export class PrismaCustomerRepository implements CustomerRepository {
  private readonly prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  private get prisma(): PrismaClient {
    return this.prismaService.getClient();
  }

  async findById(id: CustomerId, tenantContext?: TenantContext): Promise<CustomerEntity | null> {
    this.assertTenantAccess(id.getValue(), tenantContext);

    const data = await this.prisma.customer.findUnique({
      where: { id: id.getValue() }
    });

    return data ? this.toDomain(data as PrismaCustomer) : null;
  }

  async findByName(name: string, tenantContext?: TenantContext): Promise<CustomerEntity | null> {
    const data = await this.prisma.customer.findFirst({
      where: {
        name,
        ...(this.tenantWhere(tenantContext) ?? {})
      }
    });

    return data ? this.toDomain(data as PrismaCustomer) : null;
  }

  async findByDomain(domain: string, tenantContext?: TenantContext): Promise<CustomerEntity | null> {
    const data = await this.prisma.customer.findFirst({
      where: { domain }
    });

    if (!data) {
      return null;
    }

    // Non-superadmin must only see their own customer
    if (tenantContext && !tenantContext.isSuperAdminUser()) {
      const tenantId = tenantContext.getCustomerId()?.getValue() ?? null;
      if (tenantId && tenantId !== data.id) {
        return null;
      }
    }

    return this.toDomain(data as PrismaCustomer);
  }

  async findAll(tenantContext?: TenantContext): Promise<CustomerEntity[]> {
    // SUPERADMIN can list all customers
    if (tenantContext?.isSuperAdminUser?.() || !tenantContext) {
      const rows = await this.prisma.customer.findMany();
      return rows.map((row: PrismaCustomer) => this.toDomain(row));
    }

    // Regular users can only fetch their own tenant root
    const tenantId = tenantContext.getCustomerId()?.getValue() ?? null;
    if (!tenantId) {
      return [];
    }

    const row = await this.prisma.customer.findUnique({ where: { id: tenantId } });
    return row ? [this.toDomain(row as PrismaCustomer)] : [];
  }

  async save(customer: CustomerEntity, tenantContext?: TenantContext): Promise<void> {
    const customerId = customer.getId().getValue();
    this.assertTenantAccess(customerId, tenantContext);

    const settings = customer.getSettings();
    const status = this.toPrismaStatus(customer.getStatus().getValue());

    await this.prisma.customer.upsert({
      where: { id: customerId },
      create: {
        id: customerId,
        name: customer.getName().getValue(),
        slug: customer.getSlug().getValue(),
        status,
        domain: settings.getCustomDomain(),
        subscriptionTier: 'FREE'
      },
      update: {
        name: customer.getName().getValue(),
        slug: customer.getSlug().getValue(),
        status,
        domain: settings.getCustomDomain()
      }
    });
  }

  async delete(id: CustomerId, tenantContext?: TenantContext): Promise<void> {
    this.assertTenantAccess(id.getValue(), tenantContext);
    await this.prisma.customer.delete({ where: { id: id.getValue() } });
  }

  private tenantWhere(tenantContext?: TenantContext): { id: string } | null {
    if (!tenantContext) {
      return null;
    }
    if (tenantContext.isSuperAdminUser()) {
      return null;
    }
    const tenantId = tenantContext.getCustomerId()?.getValue() ?? null;
    return tenantId ? { id: tenantId } : null;
  }

  private assertTenantAccess(requestedCustomerId: string, tenantContext?: TenantContext): void {
    // Backwards-compatible behavior: when no context is available, allow the operation.
    // This matches the previous ServiceContainer inline repository behavior.
    if (!tenantContext) {
      return;
    }

    if (tenantContext.isSuperAdminUser()) {
      return;
    }

    const tenantId = tenantContext.getCustomerId()?.getValue() ?? null;
    if (tenantId && tenantId !== requestedCustomerId) {
      throw new Error(
        `Tenant boundary violation: attempted to access customer '${requestedCustomerId}' from tenant '${tenantId}'`
      );
    }
  }

  private toDomain(data: PrismaCustomer): CustomerEntity {
    const id = CustomerId.create(data.id);
    const name = CustomerName.create(data.name);
    const slug = CustomerSlug.create(data.slug);
    const status = CustomerStatus.fromString(String(data.status).toLowerCase());
    const settings = OrganizationSettings.create({ customDomain: data.domain });

    const customer = CustomerEntity.create(id, name, slug, status, settings);
    customer.updateDomain(data.domain ?? undefined);
    customer.setTimestamps(data.createdAt, data.updatedAt, data.deletedAt ?? undefined);
    customer.clearEvents();
    return customer;
  }

  private toPrismaStatus(status: string): PrismaCustomerStatus {
    const upper = status.toUpperCase();
    switch (upper) {
      case 'ACTIVE':
      case 'INACTIVE':
      case 'SUSPENDED':
      case 'PENDING':
        return upper as PrismaCustomerStatus;
      default:
        throw new Error(`Invalid customer status for persistence: ${status}`);
    }
  }
}


