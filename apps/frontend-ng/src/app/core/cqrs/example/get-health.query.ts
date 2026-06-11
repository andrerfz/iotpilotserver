import { Query } from '../types';

export interface HealthResult {
  status?: string;
  uptime?: number;
  timestamp?: string;
}

/**
 * Reference query showing the CQRS pattern feature services build on
 * (fe-core T8). Reads backend health through the QueryBus.
 */
export class GetHealthQuery implements Query<HealthResult> {
  static readonly type = 'GetHealthQuery';
}
