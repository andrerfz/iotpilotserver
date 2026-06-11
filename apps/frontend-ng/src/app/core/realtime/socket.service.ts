import { effect, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../auth/auth.service';
import { TokenStorage } from '../auth/token.storage';

/**
 * Socket.IO lifecycle bound to the auth session. Connects on login, disconnects
 * on logout, and authenticates the handshake with the session token in the
 * `auth` payload (Q5/Q2 — token, never cookies, so mobile works). Reconnection
 * with backoff is handled by socket.io-client.
 *
 * The backend tenant-scopes the connection (joins `tenant:<customerId>`), so
 * events received here are already limited to the user's tenant.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly tokens = inject(TokenStorage);
  private readonly auth = inject(AuthService);

  private socket: Socket | null = null;
  private readonly _connected = signal(false);

  /** True while the socket is connected. */
  readonly connected = this._connected.asReadonly();

  constructor() {
    // Mirror auth state: a session opens the socket, logout tears it down.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        void this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  /** Open the socket using the stored session token. No-op without a token or when already open. */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }
    const token = await this.tokens.get();
    if (!token) {
      return;
    }
    this.socket?.disconnect();
    this.socket = io({
      // Same-origin: /socket.io is proxied to the backend in dev, routed in prod.
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    this.socket.on('connect', () => this._connected.set(true));
    this.socket.on('disconnect', () => this._connected.set(false));
  }

  /** Close the socket and reset state. */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._connected.set(false);
  }

  /** Stream a server event as an observable, unsubscribing cleans up the listener. */
  on<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => subscriber.next(data);
      this.socket?.on(event, handler as (...args: unknown[]) => void);
      return () => this.socket?.off(event, handler as (...args: unknown[]) => void);
    });
  }
}
