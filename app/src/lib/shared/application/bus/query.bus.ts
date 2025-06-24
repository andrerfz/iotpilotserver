export interface QueryBus {
    execute<T, R>(query: T): Promise<R>;
}

export class InMemoryQueryBus implements QueryBus {
    private handlers = new Map<string, any>();

    register<T, R>(queryClass: new (...args: any[]) => T, handler: any) {
        this.handlers.set(queryClass.name, handler);
    }

    async execute<T, R>(query: T): Promise<R> {
        const handler = this.handlers.get(query.constructor.name);
        if (!handler) {
            throw new Error(`No handler found for ${query.constructor.name}`);
        }
        return await handler.handle(query);
    }
}