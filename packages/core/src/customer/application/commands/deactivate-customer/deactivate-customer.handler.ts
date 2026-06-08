import {DeactivateCustomerCommand} from './deactivate-customer.command';
import {CustomerEntity} from '../../../domain/entities/customer.entity';
import {CustomerId} from '../../../domain/value-objects/customer-id.vo';
import {CustomerRepository} from '@iotpilot/core/customer/domain/interfaces/customer.repository';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {CustomerStatusChangedEvent} from '../../../domain/events/customer-status-changed.event';

export class DeactivateCustomerHandler {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: DeactivateCustomerCommand): Promise<CustomerEntity> {
    const customerId = command.customerId;
    const tenantContext = command.getTenantContext();

    const customerIdVO = CustomerId.create(customerId);
    const customer = await this.customerRepository.findById(customerIdVO, tenantContext);

    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const previousStatus = customer.getStatus().getValue();
    customer.deactivate();
    await this.customerRepository.save(customer, tenantContext);

    await this.eventBus.publish(new CustomerStatusChangedEvent(
      customer.getId(),
      previousStatus,
      customer.getStatus(),
    ));

    return customer;
  }
}
