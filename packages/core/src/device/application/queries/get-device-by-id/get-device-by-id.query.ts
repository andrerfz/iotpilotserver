import {Query} from '@iotpilot/core/shared/domain/query';

export class GetDeviceByIdQuery extends Query {
    constructor(public readonly deviceId: string) {
        super();
    }
}


