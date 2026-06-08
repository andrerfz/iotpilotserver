import {Query, QueryHandler} from '../interfaces/query.interface';

export interface QueryBus {
    execute<T extends Query<R>, R = any>(query: T): Promise<R>;
}

/**
 * Gets a stable identifier for a query class that survives minification.
 * Uses static 'type' property if available, otherwise falls back to constructor name.
 */
function getQueryType(queryClass: any): string {
    // Check for static type property first (survives minification)
    if (queryClass.type) {
        return queryClass.type;
    }
    // Fallback to name (will break in production if minified)
    return queryClass.name;
}

export class InMemoryQueryBus implements QueryBus {
    private handlers = new Map<string, QueryHandler<any, any>>();

    register<T extends Query<R>, R = any>(
        queryClass: new (...args: any[]) => T,
        handler: QueryHandler<T, R>
    ): void {
        const queryType = getQueryType(queryClass);
        this.handlers.set(queryType, handler);
    }

    async execute<T extends Query<R>, R = any>(query: T): Promise<R> {
        // Get type from static property or constructor
        const queryType = getQueryType(query.constructor);
        const handler = this.handlers.get(queryType);

        if (!handler) {
            console.error(`[QueryBus] No handler for query type: ${queryType}`);
            console.error(`[QueryBus] Registered types: ${Array.from(this.handlers.keys()).join(', ')}`);
            throw new Error(`No handler found for ${queryType}`);
        }

        return handler.handle(query);
    }
}
