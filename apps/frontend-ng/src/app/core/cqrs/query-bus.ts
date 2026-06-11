import { inject, Injectable, InjectionToken, Provider, Type } from '@angular/core';
import { messageType, Query, QueryHandler } from './types';

/** Multi-provider token collecting every registered query handler. */
export const QUERY_HANDLERS = new InjectionToken<QueryHandler[]>('QUERY_HANDLERS');

/**
 * Dispatches queries to their registered handler. Handlers are wired through
 * Angular DI multi-providers ({@link provideQueryHandler}).
 */
@Injectable({ providedIn: 'root' })
export class QueryBus {
  private readonly handlers = new Map<string, QueryHandler>();

  constructor() {
    for (const handler of inject(QUERY_HANDLERS, { optional: true }) ?? []) {
      this.handlers.set(messageType(handler.query), handler);
    }
  }

  execute<R>(query: Query<R>): Promise<R> {
    const key = messageType((query as object).constructor);
    const handler = this.handlers.get(key);
    if (!handler) {
      throw new Error(`No handler registered for query "${key}"`);
    }
    return handler.handle(query) as Promise<R>;
  }
}

/**
 * Register a query handler. Provides the handler class and adds it to the
 * QUERY_HANDLERS multi-provider so the bus discovers it via DI.
 */
export function provideQueryHandler<Q extends Query, R>(
  handler: Type<QueryHandler<Q, R>>,
): Provider[] {
  return [handler, { provide: QUERY_HANDLERS, useExisting: handler, multi: true }];
}
