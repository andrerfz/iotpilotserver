import {DomainEventBase} from '@/lib/shared/domain/events/domain.event';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ApiKeyId} from '../value-objects/api-key-id.vo';
import {UserId} from '../value-objects/user-id.vo';

/**
 * Domain event fired when an API key is created
 */
export class ApiKeyCreatedEvent extends DomainEventBase {
    constructor(
        public readonly apiKeyId: ApiKeyId,
        public readonly userId: UserId,
        public readonly customerId: CustomerId
    ) {
        super();
    }

    getName(): string {
        return 'ApiKeyCreated';
    }

    getTenantId(): string | null {
        return this.customerId.getValue();
    }
}

