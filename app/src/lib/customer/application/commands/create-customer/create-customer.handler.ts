import {CreateCustomerCommand} from './create-customer.command';
import {CustomerEntity} from '../../../domain/entities/customer.entity';
import {CustomerName} from '../../../domain/value-objects/customer-name.vo';
import {CustomerId} from '../../../domain/value-objects/customer-id.vo';
import {Uuid} from '@/lib/shared/domain/value-objects/uuid.vo';
import {CustomerRepository} from '@/lib/customer/domain/interfaces/customer.repository';
import {CryptoService} from '@/lib/shared/domain/interfaces/crypto-service.interface';

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
    
    // Update additional properties
    if (contactEmail) {
      customer.updateContact(contactEmail);
    }
    if (description) {
      customer.updateDescription(description);
    }

    await this.customerRepository.save(customer, tenantContext);

    return customer;
  }
}
