import { Injectable, runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../errors/api-error';
import { provideQueryHandler, QueryBus } from './query-bus';
import { runQuery } from './run-query';
import { Query, QueryHandler } from './types';

class CountQuery implements Query<number> {
  static readonly type = 'CountQuery';
}

/** Handler whose next result is controllable per test (resolve or reject). */
let nextResult: () => Promise<number>;

@Injectable()
class CountHandler implements QueryHandler<CountQuery, number> {
  readonly query = CountQuery;
  handle(): Promise<number> {
    return nextResult();
  }
}

describe('runQuery', () => {
  let injector: EnvironmentInjector;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideQueryHandler(CountHandler)] });
    injector = TestBed.inject(EnvironmentInjector);
  });

  it('transitions loading → data on success (end-to-end through the bus)', async () => {
    let resolve!: (n: number) => void;
    nextResult = () => new Promise<number>((r) => (resolve = r));
    const runner = runInInjectionContext(injector, () => runQuery<number>());

    expect(runner.loading()).toBe(false);
    expect(runner.data()).toBeNull();

    const promise = runner.run(new CountQuery());
    expect(runner.loading()).toBe(true);

    resolve(42);
    await promise;

    expect(runner.loading()).toBe(false);
    expect(runner.data()).toBe(42);
    expect(runner.error()).toBeNull();
  });

  it('captures the error and clears loading on failure', async () => {
    nextResult = () => Promise.reject(new ApiError(403, 'FORBIDDEN', 'nope'));
    const runner = runInInjectionContext(injector, () => runQuery<number>());

    const result = await runner.run(new CountQuery());

    expect(result).toBeNull();
    expect(runner.loading()).toBe(false);
    expect(runner.error()).toBeInstanceOf(ApiError);
    expect(runner.error()?.status).toBe(403);
    expect(runner.data()).toBeNull();
  });

  it('reload() re-runs the last query (invalidation hook)', async () => {
    let n = 0;
    nextResult = () => Promise.resolve(++n);
    const runner = runInInjectionContext(injector, () => runQuery<number>());

    await runner.run(new CountQuery());
    expect(runner.data()).toBe(1);

    await runner.reload();
    expect(runner.data()).toBe(2);
  });

  it('reload() before any run resolves to null', async () => {
    nextResult = () => Promise.resolve(1);
    const runner = runInInjectionContext(injector, () => runQuery<number>());
    expect(await runner.reload()).toBeNull();
  });

  it('clears a prior error on the next run', async () => {
    const runner = runInInjectionContext(injector, () => runQuery<number>());

    nextResult = () => Promise.reject(new ApiError(500, 'INTERNAL_ERROR', 'boom'));
    await runner.run(new CountQuery());
    expect(runner.error()).not.toBeNull();

    nextResult = () => Promise.resolve(7);
    await runner.run(new CountQuery());
    expect(runner.error()).toBeNull();
    expect(runner.data()).toBe(7);
  });
});

describe('GetHealthHandler (example wired end-to-end)', () => {
  it('returns data through the QueryBus + runQuery', async () => {
    const { GetHealthHandler } = await import('./example/get-health.handler');
    const { GetHealthQuery } = await import('./example/get-health.query');
    const { Api } = await import('../api/generated/api');

    const fakeApi = { invoke: () => Promise.resolve({ status: 'healthy', uptime: 1 }) };
    TestBed.configureTestingModule({
      providers: [provideQueryHandler(GetHealthHandler), { provide: Api, useValue: fakeApi }],
    });
    const inj = TestBed.inject(EnvironmentInjector);
    TestBed.inject(QueryBus); // ensure bus picks up the handler

    const runner = runInInjectionContext(inj, () => runQuery<{ status?: string }>());
    const data = await runner.run(new GetHealthQuery());

    expect(data).toEqual({ status: 'healthy', uptime: 1 });
    expect(runner.data()).toEqual({ status: 'healthy', uptime: 1 });
    expect(runner.error()).toBeNull();
  });
});
