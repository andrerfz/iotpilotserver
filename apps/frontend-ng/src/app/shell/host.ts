import { InjectionToken } from '@angular/core';

/**
 * Local-development host detection — parity with the legacy `isLocalDevelopment()`
 * (env.ts): localhost / iotpilotserver.test / 127.0.0.1. Gates SUPERADMIN infra
 * tooling (Grafana / InfluxDB / Debug) in the user menu.
 */
export function isLocalDevelopment(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === 'iotpilotserver.test' || h === '127.0.0.1';
}

/** Injectable so the role×host gating is testable without touching window.location. */
export const HOST_IS_LOCAL = new InjectionToken<boolean>('HOST_IS_LOCAL', {
  providedIn: 'root',
  factory: isLocalDevelopment,
});
