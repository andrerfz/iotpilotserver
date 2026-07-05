import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Api } from '../api/generated/api';
import { getSecuritySettings } from '../api/generated/fn/settings/get-security-settings';

const WARNING_SECONDS = 60;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;
/** Don't reset the idle timer on every pixel of mouse movement. */
const ACTIVITY_THROTTLE_MS = 5000;

/**
 * Auto-logs-out an idle session. Configured per-user via Settings → Security
 * (sessionTimeout minutes, 0 = disabled), read once per session from
 * GET /settings/security — not re-fetched on every page, mirroring how
 * ThemeService is *meant* to hydrate once post-login (that one is dead code;
 * this service is what actually gets started, from ShellComponent).
 *
 * Warns WARNING_SECONDS before logout (`warningVisible`/`secondsRemaining`
 * signals — ShellComponent renders the countdown modal); any activity during
 * the warning cancels it and restarts the full timer.
 */
@Injectable({ providedIn: 'root' })
export class IdleTimeoutService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(Api);

  readonly warningVisible = signal(false);
  readonly secondsRemaining = signal(WARNING_SECONDS);

  private timeoutMinutes = 0;
  private started = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private lastActivityAt = 0;

  private readonly onActivity = (): void => {
    const now = Date.now();
    if (now - this.lastActivityAt < ACTIVITY_THROTTLE_MS) return;
    this.lastActivityAt = now;
    if (this.warningVisible()) {
      this.stayConnected();
    } else {
      this.armIdleTimer();
    }
  };

  /** Call once per authenticated session (ShellComponent constructor). */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    try {
      const res = await this.api.invoke(getSecuritySettings, {});
      const data = (res as unknown as { data?: typeof res }).data ?? res;
      this.timeoutMinutes = parseInt(data.sessionTimeout ?? '0', 10) || 0;
    } catch {
      // Fail open — a settings-load hiccup must never lock someone out.
      this.timeoutMinutes = 0;
    }

    if (this.timeoutMinutes <= 0) return;

    for (const evt of ACTIVITY_EVENTS) {
      document.addEventListener(evt, this.onActivity, { passive: true, capture: true });
    }
    this.armIdleTimer();
  }

  /** Call on shell teardown (logout) so listeners/timers don't leak. */
  stop(): void {
    this.started = false;
    this.clearTimers();
    this.warningVisible.set(false);
    for (const evt of ACTIVITY_EVENTS) {
      document.removeEventListener(evt, this.onActivity, { capture: true });
    }
  }

  /** "Stay signed in" — dismiss the warning and restart the full timer. */
  stayConnected(): void {
    this.warningVisible.set(false);
    this.armIdleTimer();
  }

  private armIdleTimer(): void {
    this.clearTimers();
    const warnAfterMs = Math.max(0, this.timeoutMinutes * 60_000 - WARNING_SECONDS * 1000);
    this.idleTimer = setTimeout(() => this.showWarning(), warnAfterMs);
  }

  private showWarning(): void {
    this.warningVisible.set(true);
    this.secondsRemaining.set(WARNING_SECONDS);
    this.countdownInterval = setInterval(() => {
      const next = this.secondsRemaining() - 1;
      if (next <= 0) {
        void this.expire();
      } else {
        this.secondsRemaining.set(next);
      }
    }, 1000);
  }

  private async expire(): Promise<void> {
    this.stop();
    await this.auth.logout();
    await this.router.navigate(['/login'], { queryParams: { reason: 'idle' } });
  }

  private clearTimers(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.idleTimer = null;
    this.countdownInterval = null;
  }
}
