import {CreateCustomerCommand} from './create-customer.command';
import {CustomerEntity} from '../../../domain/entities/customer.entity';
import {CustomerName} from '../../../domain/value-objects/customer-name.vo';
import {CustomerId} from '../../../domain/value-objects/customer-id.vo';
import {Uuid} from '@iotpilot/core/shared/domain/value-objects/uuid.vo';
import {CustomerRepository} from '@iotpilot/core/customer/domain/interfaces/customer.repository';
import {CryptoService} from '@iotpilot/core/shared/domain/interfaces/crypto-service.interface';

export class CreateCustomerHandler {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly cryptoService: CryptoService
  ) {}

  async handle(command: CreateCustomerCommand): Promise<CustomerEntity> {
    const { name, description, contactEmail } = command;
    const tenantContext = command.getTenantContext();
    
    // Generate UUID for customer ID
    const customerId = CustomerId.create(Uuid.random(this.cryptoService).getValue());
    const customerName = CustomerName.create(name);

    const customer = CustomerEntity.create(customerId, customerName);

    // Set the domain from contactEmail (which is the email domain during registration)
    // This enables findByDomain to work for subsequent users from the same company
    if (contactEmail) {
      customer.updateContact(contactEmail);
      customer.updateDomain(contactEmail);
    }
    if (description) {
      customer.updateDescription(description);
    }

    await this.customerRepository.save(customer, tenantContext);

    return customer;
  }
}
