import { inject, Injectable } from '@angular/core';
import { Api } from '../../api/generated/api';
import { healthCheck } from '../../api/generated/fn/system/health-check';
import { QueryHandler } from '../types';
import { GetHealthQuery, HealthResult } from './get-health.query';

/**
 * Reference query handler wired end-to-end (fe-core T8): resolves a
 * {@link GetHealthQuery} via the generated client. Feature modules follow this
 * shape — a thin handler over the generated API, dispatched through the QueryBus.
 */
@Injectable()
export class GetHealthHandler implements QueryHandler<GetHealthQuery, HealthResult> {
  readonly query = GetHealthQuery;
  private readonly api = inject(Api);

  handle(): Promise<HealthResult> {
    return this.api.invoke(healthCheck, {});
  }
}
