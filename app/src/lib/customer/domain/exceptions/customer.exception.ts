import {CustomerId} from '../value-objects/customer-id.vo';

export abstract class CustomerException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  abstract getStatusCode(): number;
  abstract getErrorCode(): string;
}

export class CustomerNotFoundException extends CustomerException {
  constructor(customerId: CustomerId | string) {
    const id = customerId instanceof CustomerId ? customerId.getValue() : customerId;
    super(`Customer not found: ${id}`);
  }

  getStatusCode(): number {
    return 404;
  }

  getErrorCode(): string {
    return 'CUSTOMER_NOT_FOUND';
  }
}

export class CustomerAlreadyExistsException extends CustomerException {
  constructor(customerId: CustomerId | string) {
    const id = customerId instanceof CustomerId ? customerId.getValue() : customerId;
    super(`Customer already exists: ${id}`);
  }

  getStatusCode(): number {
    return 409;
  }

  getErrorCode(): string {
    return 'CUSTOMER_ALREADY_EXISTS';
  }
}

export class CustomerInvalidStatusException extends CustomerException {
  constructor(currentStatus: string, attemptedStatus: string, message?: string) {
    super(message || `Cannot change customer status from ${currentStatus} to ${attemptedStatus}`);
  }

  getStatusCode(): number {
    return 400;
  }

  getErrorCode(): string {
    return 'CUSTOMER_INVALID_STATUS';
  }
}

export class CustomerInvalidSettingsException extends CustomerException {
  constructor(field: string, value: any) {
    super(`Invalid customer setting for ${field}: ${value}`);
  }

  getStatusCode(): number {
    return 400;
  }

  getErrorCode(): string {
    return 'CUSTOMER_INVALID_SETTINGS';
  }
}

export class CustomerDeactivatedException extends CustomerException {
  constructor(customerId: CustomerId | string) {
    const id = customerId instanceof CustomerId ? customerId.getValue() : customerId;
    super(`Customer ${id} is deactivated`);
  }

  getStatusCode(): number {
    return 403;
  }

  getErrorCode(): string {
    return 'CUSTOMER_DEACTIVATED';
  }
}

export class CustomerSuspendedException extends CustomerException {
  constructor(customerId: CustomerId | string) {
    const id = customerId instanceof CustomerId ? customerId.getValue() : customerId;
    super(`Customer ${id} is suspended`);
  }

  getStatusCode(): number {
    return 403;
  }

  getErrorCode(): string {
    return 'CUSTOMER_SUSPENDED';
  }
}
