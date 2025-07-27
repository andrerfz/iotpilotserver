import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {CustomerName} from '../domain/value-objects/customer-name.vo';
import {CustomerSlug} from '../domain/value-objects/customer-slug.vo';
import {CustomerStatus, CustomerStatusType} from '../domain/value-objects/customer-status.vo';
import {OrganizationSettings} from '../domain/value-objects/organization-settings.vo';
import {CustomerEntity} from '../domain/entities/customer.entity';

/**
 * Factory for creating customer entities and related objects for testing
 */
export class CustomerTestFactory {
    /**
     * Create a customer entity with default values
     * @param id Optional customer ID (generated if not provided)
     * @param name Optional customer name (default: 'Test Customer')
     * @param status Optional customer status (default: 'active')
     * @param settings Optional organization settings (default settings created if not provided)
     * @returns A customer entity
     */
    static createCustomer(
        id?: string,
        name: string = 'Test Customer',
        status: CustomerStatusType = 'active',
        settings?: OrganizationSettings,
        slug?: CustomerSlug
    ): CustomerEntity {
        const customerId = CustomerId.create(id || crypto.randomUUID());
        const customerName = CustomerName.create(name);
        const organizationSettings = settings || this.createDefaultSettings();

        // Generate a unique slug if not provided
        const uniqueId = crypto.randomUUID().substring(0, 8);
        const uniqueName = name + '-' + uniqueId;
        const customerSlug = slug || CustomerSlug.createFromName(uniqueName);

        const customer = CustomerEntity.create(
            customerId,
            customerName,
            customerSlug,
            CustomerStatus.active(),
            organizationSettings
        );

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
        return OrganizationSettings.create({
            maxUsers,
            maxDevices,
            allowedFeatures: features,
            customDomain
        });
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
     * @param status The status value (default: 'active')
     * @returns A customer status value object
     */
    static createCustomerStatus(status: CustomerStatusType = 'active'): CustomerStatus {
        return CustomerStatus.create(status);
    }

    /**
     * Create a customer slug
     * @param slug The slug value (default: 'test-customer')
     * @returns A customer slug value object
     */
    static createCustomerSlug(slug: string = 'test-customer'): CustomerSlug {
        return CustomerSlug.create(slug);
    }

    /**
     * Create multiple customers for testing
     * @param count The number of customers to create
     * @returns An array of customer entities
     */
    static createMultipleCustomers(count: number): CustomerEntity[] {
        const customers: CustomerEntity[] = [];

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
    ): CustomerEntity {
        const settings = this.createDefaultSettings(
            maxUsers,
            maxDevices,
            features
        );

        return this.createCustomer(undefined, 'Customer with Custom Settings', 'active', settings);
    }

    /**
     * Create an inactive customer
     * @param name Optional customer name (default: 'Inactive Customer')
     * @returns An inactive customer entity
     */
    static createInactiveCustomer(name: string = 'Inactive Customer'): CustomerEntity {
        return this.createCustomer(undefined, name, 'inactive');
    }

    /**
     * Create a suspended customer
     * @param name Optional customer name (default: 'Suspended Customer')
     * @returns A suspended customer entity
     */
    static createSuspendedCustomer(name: string = 'Suspended Customer'): CustomerEntity {
        return this.createCustomer(undefined, name, 'suspended');
    }
}
