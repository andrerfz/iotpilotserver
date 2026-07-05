import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Api } from '../api/generated/api';
import { AuthService } from './auth.service';
import { IdleTimeoutService } from './idle-timeout.service';

describe('IdleTimeoutService', () => {
  let svc: IdleTimeoutService;
  let logout: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  function setupWithTimeout(sessionTimeout: string): void {
    logout = vi.fn().mockResolvedValue(undefined);
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        IdleTimeoutService,
        { provide: Api, useValue: { invoke: vi.fn().mockResolvedValue({ sessionTimeout }) } },
        { provide: AuthService, useValue: { logout } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    svc = TestBed.inject(IdleTimeoutService);
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    svc?.stop();
    vi.useRealTimers();
  });

  it('does nothing when sessionTimeout is 0 (disabled)', async () => {
    setupWithTimeout('0');
    await svc.start();
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(svc.warningVisible()).toBe(false);
  });

  it('shows the warning 60s before the configured timeout elapses', async () => {
    setupWithTimeout('1');
    await svc.start();

    await vi.advanceTimersByTimeAsync(1 * 60_000 - 60_000);
    expect(svc.warningVisible()).toBe(true);
    expect(svc.secondsRemaining()).toBe(60);
  });

  it('expires and redirects to /login?reason=idle when the countdown reaches zero', async () => {
    setupWithTimeout('1');
    await svc.start();

    await vi.advanceTimersByTimeAsync(1 * 60_000 - 60_000);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'idle' } });
  });

  it('stayConnected() dismisses the warning and restarts the timer', async () => {
    setupWithTimeout('2');
    await svc.start();

    await vi.advanceTimersByTimeAsync(2 * 60_000 - 60_000);
    expect(svc.warningVisible()).toBe(true);

    svc.stayConnected();
    expect(svc.warningVisible()).toBe(false);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(svc.warningVisible()).toBe(false);
  });

  it('fails open (no timer armed) when the settings request rejects', async () => {
    TestBed.configureTestingModule({
      providers: [
        IdleTimeoutService,
        { provide: Api, useValue: { invoke: vi.fn().mockRejectedValue(new Error('network')) } },
        { provide: AuthService, useValue: { logout: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    svc = TestBed.inject(IdleTimeoutService);

    await svc.start();
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(svc.warningVisible()).toBe(false);
  });
});
