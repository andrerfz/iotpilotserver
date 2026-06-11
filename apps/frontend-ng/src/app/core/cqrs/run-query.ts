import { inject, Signal, signal } from '@angular/core';
import { ApiError } from '../errors/api-error';
import { QueryBus } from './query-bus';
import { Query } from './types';

/** Reactive view over a query execution: data/loading/error signals + run/reload. */
export interface QueryRunner<R> {
  readonly data: Signal<R | null>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<ApiError | null>;
  /** Execute (or re-execute) the query, updating the signals. Resolves to the data, or null on error. */
  run(query: Query<R>): Promise<R | null>;
  /** Re-run the last query — the invalidation hook for refetching after a command. */
  reload(): Promise<R | null>;
}

/**
 * Signal-based query helper mirroring the legacy `use-query` 1:1 (Q3): exposes
 * `{ data, loading, error }` plus `run`/`reload`. Server state lives here in
 * feature services — no NgRx/TanStack. Must be called in an injection context.
 *
 * Errors arrive already normalized to {@link ApiError} (the auth interceptor maps
 * HttpErrorResponse → ApiError on the way out).
 */
export function runQuery<R>(): QueryRunner<R> {
  const bus = inject(QueryBus);
  const data = signal<R | null>(null);
  const loading = signal(false);
  const error = signal<ApiError | null>(null);
  let last: Query<R> | null = null;

  async function run(query: Query<R>): Promise<R | null> {
    last = query;
    loading.set(true);
    error.set(null);
    try {
      const result = await bus.execute<R>(query);
      data.set(result);
      return result;
    } catch (e) {
      error.set(
        e instanceof ApiError ? e : new ApiError(0, 'UNKNOWN', e instanceof Error ? e.message : String(e)),
      );
      return null;
    } finally {
      loading.set(false);
    }
  }

  function reload(): Promise<R | null> {
    return last ? run(last) : Promise.resolve(null);
  }

  return {
    data: data.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    run,
    reload,
  };
}
