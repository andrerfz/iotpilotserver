import {Query} from '@/lib/shared/application/interfaces/query.interface';

export class GetCurrentUserQuery implements Query<any> {
    constructor(
        public readonly token: string
    ) {}
}