import {TenantAwareQuery} from '@/lib/shared/application/queries/tenant-aware-query';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';

/**
 * Filter options for listing devices
 */
export interface DeviceListFilters {
  status?: 'active' | 'inactive' | 'all';
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Query for listing devices with optional filtering
 */
export class ListDevicesQuery extends TenantAwareQuery<any> {
  /** Static type identifier that survives minification */
  static readonly type = 'ListDevicesQuery';

  public readonly page: number;
  public readonly limit: number;
  public readonly sortBy: string;
  public readonly sortOrder: 'asc' | 'desc';

  private constructor(
    tenantContext: TenantContext,
    public readonly filters: DeviceListFilters,
    public readonly customerId: CustomerId | null
  ) {
    super(tenantContext);
    this.page = Math.floor((filters.offset || 0) / (filters.limit || 100)) + 1;
    this.limit = filters.limit || 100;
    this.sortBy = filters.sortBy || 'createdAt';
    this.sortOrder = filters.sortDirection || 'desc';
  }

  /**
   * Creates a new ListDevicesQuery
   * @param filters Optional filters for the device list
   * @param customerId The customer ID the devices belong to
   * @param tenantContext The tenant context for the query
   */
  static create(
    filters: DeviceListFilters = {},
    customerId?: string,
    tenantContext?: TenantContext
  ): ListDevicesQuery {
    if (!tenantContext) {
      throw new Error('Tenant context is required');
    }

    // Apply default values to filters
    const defaultedFilters: DeviceListFilters = {
      status: filters.status || 'all',
      search: filters.search || '',
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      sortBy: filters.sortBy || 'name',
      sortDirection: filters.sortDirection || 'asc'
    };

    // Handle customerId
    let customerIdVO: CustomerId | null = null;
    if (customerId) {
      customerIdVO = CustomerId.create(customerId);
    } else if (tenantContext.canBypassTenantRestrictions()) {
      // SUPERADMIN users can query across all tenants, so customerId can be null
      customerIdVO = null;
    } else {
      const contextCustomerId = tenantContext.getCustomerId();
      if (!contextCustomerId) {
        throw new Error('No customer ID provided and none available in tenant context');
      }
      customerIdVO = contextCustomerId;
    }

    return new ListDevicesQuery(
      tenantContext,
      defaultedFilters,
      customerIdVO
    );
  }
}
