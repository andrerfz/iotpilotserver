import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { CustomerName } from '../domain/value-objects/customer-name.vo';
import { CustomerStatus, CustomerStatusEnum } from '../domain/value-objects/customer-status.vo';
import { OrganizationSettings } from '../domain/value-objects/organization-settings.vo';
import { Customer } from '../domain/entities/customer.entity';

/**
 * Factory for creating customer entities and related objects for testing
 */
export class CustomerTestFactory {
  /**
   * Create a customer entity with default values
   * @param id Optional customer ID (generated if not provided)
   * @param name Optional customer name (default: 'Test Customer')
   * @param status Optional customer status (default: ACTIVE)
   * @param settings Optional organization settings (default settings created if not provided)
   * @returns A customer entity
   */
  static createCustomer(
    id?: string,
    name: string = 'Test Customer',
    status: CustomerStatusEnum = CustomerStatusEnum.ACTIVE,
    settings?: OrganizationSettings
  ): Customer {
    const customerId = CustomerId.create(id || crypto.randomUUID());
    const customerName = CustomerName.create(name);
    const organizationSettings = settings || this.createDefaultSettings();
    
    const customer = Customer.create(customerId, customerName, organizationSettings);
    
    // Set the correct status if not ACTIVE
    if (status === CustomerStatusEnum.INACTIVE) {
      customer.deactivate();
    } else if (status === CustomerStatusEnum.SUSPENDED) {
      customer.suspend();
    }
    
    // Clear events to avoid side effects in tests
    customer.clearEvents();
    
    return customer;
  }
  
  /**
   * Create default organization settings
   * @param maxUsers Optional maximum users (default: 10)
   * @param maxDevices Optional maximum devices (default: 50)
   * @param features Optional features (default: ['basic_monitoring', 'alerts'])
   * @param theme Optional theme (default: 'default')
   * @param customDomain Optional custom domain (default: null)
   * @returns Organization settings
   */
  static createDefaultSettings(
    maxUsers: number = 10,
    maxDevices: number = 50,
    features: string[] = ['basic_monitoring', 'alerts'],
    theme: string = 'default',
    customDomain: string | null = null
  ): OrganizationSettings {
    return OrganizationSettings.create(
      maxUsers,
      maxDevices,
      features,
      theme,
      customDomain
    );
  }
  
  /**
   * Create a customer ID
   * @param id Optional ID value (generated if not provided)
   * @returns A customer ID value object
   */
  static createCustomerId(id?: string): CustomerId {
    return CustomerId.create(id || crypto.randomUUID());
  }
  
  /**
   * Create a customer name
   * @param name The name value (default: 'Test Customer')
   * @returns A customer name value object
   */
  static createCustomerName(name: string = 'Test Customer'): CustomerName {
    return CustomerName.create(name);
  }
  
  /**
   * Create a customer status
   * @param status The status value (default: ACTIVE)
   * @returns A customer status value object
   */
  static createCustomerStatus(status: CustomerStatusEnum = CustomerStatusEnum.ACTIVE): CustomerStatus {
    return new CustomerStatus(status);
  }
  
  /**
   * Create multiple customers for testing
   * @param count The number of customers to create
   * @returns An array of customer entities
   */
  static createMultipleCustomers(count: number): Customer[] {
    const customers: Customer[] = [];
    
    for (let i = 0; i < count; i++) {
      customers.push(this.createCustomer(
        undefined,
        `Test Customer ${i + 1}`
      ));
    }
    
    return customers;
  }
  
  /**
   * Create a customer with custom organization settings
   * @param maxUsers Maximum users
   * @param maxDevices Maximum devices
   * @param features Features array
   * @returns A customer entity with custom settings
   */
  static createCustomerWithSettings(
    maxUsers: number,
    maxDevices: number,
    features: string[]
  ): Customer {
    const settings = this.createDefaultSettings(
      maxUsers,
      maxDevices,
      features
    );
    
    return this.createCustomer(undefined, 'Customer with Custom Settings', CustomerStatusEnum.ACTIVE, settings);
  }
  
  /**
   * Create an inactive customer
   * @param name Optional customer name (default: 'Inactive Customer')
   * @returns An inactive customer entity
   */
  static createInactiveCustomer(name: string = 'Inactive Customer'): Customer {
    return this.createCustomer(undefined, name, CustomerStatusEnum.INACTIVE);
  }
  
  /**
   * Create a suspended customer
   * @param name Optional customer name (default: 'Suspended Customer')
   * @returns A suspended customer entity
   */
  static createSuspendedCustomer(name: string = 'Suspended Customer'): Customer {
    return this.createCustomer(undefined, name, CustomerStatusEnum.SUSPENDED);
  }
}