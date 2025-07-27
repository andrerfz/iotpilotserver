import {Query} from '@/lib/shared/application/query';

/**
 * Query to get system health status
 * This is a public query that doesn't require tenant context
 */
export class GetSystemHealthQuery extends Query {
    /** Static type identifier that survives minification */
    static readonly type = 'GetSystemHealthQuery';

    constructor() {
        super();
    }

    static create(): GetSystemHealthQuery {
        return new GetSystemHealthQuery();
    }
}

