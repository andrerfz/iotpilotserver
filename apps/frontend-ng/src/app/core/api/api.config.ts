import { Provider } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiConfiguration } from './generated/api-configuration';

/**
 * Wires the generated client's root URL from the environment.
 *
 * The generated `ApiConfiguration` ships a hard-coded default; this provider
 * overrides it with `environment.apiBaseUrl` (`/api`), so requests flow through
 * the dev proxy (proxy.conf.js) in development and nginx/Traefik routing in
 * production. Register it once in `main.ts` providers.
 */
export function provideApi(): Provider {
  return {
    provide: ApiConfiguration,
    useValue: Object.assign(new ApiConfiguration(), {
      rootUrl: environment.apiBaseUrl,
    }),
  };
}
