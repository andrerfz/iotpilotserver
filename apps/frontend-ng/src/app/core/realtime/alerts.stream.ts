import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Alert } from '../api/generated/models/alert';
import { SocketService } from './socket.service';

/**
 * Tenant-scoped stream of real-time alerts (`alert:new`). The backend emits only
 * to the connection's `tenant:<customerId>` room, so a subscriber never sees
 * another tenant's alerts. Consumed by monitoring features.
 */
@Injectable({ providedIn: 'root' })
export class AlertsStream {
  private readonly socket = inject(SocketService);

  /** Emits each new alert pushed for the current tenant. */
  readonly alerts$: Observable<Alert> = this.socket.on<Alert>('alert:new');
}
