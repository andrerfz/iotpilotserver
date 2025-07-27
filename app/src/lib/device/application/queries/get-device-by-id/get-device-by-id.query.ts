import {Query} from '@/lib/shared/domain/query';

export class GetDeviceByIdQuery extends Query {
    constructor(public readonly deviceId: string) {
        super();
    }
}


