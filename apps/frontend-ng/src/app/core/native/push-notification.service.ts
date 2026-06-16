import { inject, Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  ActionPerformed,
  PushNotifications,
  PushNotificationSchema,
  Token,
} from '@capacitor/push-notifications';
import { Api } from '../api/generated/api';
import { registerPushToken } from '../api/generated/fn/users/register-push-token';
import { deregisterPushToken } from '../api/generated/fn/users/deregister-push-token';

/**
 * Manages FCM/APNs push notifications on native platforms.
 * On web, all methods are no-ops; signals stay null.
 *
 * Call init() from ShellComponent after the app has bootstrapped.
 * Call deregister() from AuthService.logout() to remove the token from the server.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly api = inject(Api);

  /** FCM/APNs device token after successful registration, or null. */
  readonly token = signal<string | null>(null);
  /** Latest foreground push payload. */
  readonly latestNotification = signal<PushNotificationSchema | null>(null);
  /** Latest notification tap action — used by ShellComponent for deeplink routing. */
  readonly latestTap = signal<ActionPerformed | null>(null);

  async requestPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!Capacitor.isNativePlatform()) return 'denied';
    const { receive } = await PushNotifications.requestPermissions();
    return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt';
  }

  /**
   * Full initialization: request permission → register with FCM/APNs →
   * wire listeners → send token to backend.
   */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const permission = await this.requestPermission();
    if (permission !== 'granted') return;

    await PushNotifications.register();

    await PushNotifications.addListener('registration', async (t: Token) => {
      this.token.set(t.value);
      await this.sendTokenToServer(t.value);
    });

    await PushNotifications.addListener(
      'pushNotificationReceived',
      (n: PushNotificationSchema) => {
        this.latestNotification.set(n);
      },
    );

    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        this.latestTap.set(action);
      },
    );
  }

  /** Remove the stored token from the server on logout. */
  async deregister(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.token()) return;
    try {
      await this.api.invoke(deregisterPushToken, {});
    } catch {
      // Best-effort: token will expire server-side eventually.
    }
    await PushNotifications.removeAllListeners();
    this.token.set(null);
  }

  private async sendTokenToServer(token: string): Promise<void> {
    const platform = Capacitor.getPlatform() as 'ios' | 'android';
    try {
      await this.api.invoke(registerPushToken, { body: { token, platform } });
    } catch {
      // Non-fatal: the app still works without push; retry on next registration.
    }
  }
}
