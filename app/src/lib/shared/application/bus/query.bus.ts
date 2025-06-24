import {Query, QueryHandler} from '../interfaces/query.interface';

export interface QueryBus {
    execute<T extends Query<R>, R = any>(query: T): Promise<R>;
}

export class InMemoryQueryBus implements QueryBus {
    private handlers = new Map<string, QueryHandler<any, any>>();

    register<T extends Query<R>, R = any>(
        queryClass: new (...args: any[]) => T,
        handler: QueryHandler<T, R>
    ): void {
        this.handlers.set(queryClass.name, handler);
    }

    async execute<T extends Query<R>, R = any>(query: T): Promise<R> {
        const queryName = query.constructor.name;
        const handler = this.handlers.get(queryName);

        if (!handler) {
            throw new Error(`No handler found for ${queryName}`);
        }

        return await handler.handle(query);
    }
}
