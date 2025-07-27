import {Query} from '@/lib/shared/application/interfaces/query.interface';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {AlertId} from '../../../domain/value-objects/alert-id.vo';

export class GetAlertDetailsQuery implements Query {
    private constructor(
        public readonly alertId: AlertId,
        public readonly tenantId: CustomerId
    ) {}

    static create(
        alertId: string,
        tenantId: string
    ): GetAlertDetailsQuery {
        return new GetAlertDetailsQuery(
            AlertId.fromString(alertId),
            CustomerId.create(tenantId)
        );
    }
}