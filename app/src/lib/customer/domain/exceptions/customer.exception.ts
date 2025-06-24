import { DomainException } from '@/lib/shared/domain/exceptions/domain.exception';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';

export class CustomerException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class CustomerNotFoundException extends CustomerException {
  constructor(customerId: CustomerId | string) {
    const id = typeof customerId === 'string' ? customerId : customerId.getValue();
    super(`Customer with ID ${id} not found`);
  }
}

export class CustomerAlreadyExistsException extends CustomerException {
  constructor(customerId: CustomerId | string) {
    const id = typeof customerId === 'string' ? customerId : customerId.getValue();
    super(`Customer with ID ${id} already exists`);
  }
}

export class CustomerInvalidStatusException extends CustomerException {
  constructor(message: string) {
    super(message);
  }
}

export class CustomerInvalidSettingsException extends CustomerException {
  constructor(message: string) {
    super(message);
  }
}

export class CustomerDeactivatedException extends CustomerException {
  constructor(customerId: CustomerId | string) {
    const id = typeof customerId === 'string' ? customerId : customerId.getValue();
    super(`Customer with ID ${id} is deactivated`);
  }
}

export class CustomerSuspendedException extends CustomerException {
  constructor(customerId: CustomerId | string) {
    const id = typeof customerId === 'string' ? customerId : customerId.getValue();
    super(`Customer with ID ${id} is suspended`);
  }
}
