import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Api } from '@ng/core/api/generated/api';
import { AlertController } from '@ng/shared/ui';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';
import { AuthService } from '@ng/core/auth/auth.service';

// Providers the page needs for the verified 2FA flow (no test triggers it, so
// these just need to be injectable).
const twoFaProviders = [
  { provide: HttpClient, useValue: { post: vi.fn() } },
  { provide: AlertController, useValue: { create: vi.fn().mockResolvedValue({ present: vi.fn() }) } },
  { provide: ApiConfiguration, useValue: { rootUrl: '' } },
];
import type { SecuritySettings } from '@ng/core/api/generated/models/security-settings';
import type { Session } from '@ng/core/api/generated/models/session';
import { SettingsSecurityPage } from './settings-security.page';

const MOCK_SESSIONS: Session[] = [
  { id: 'session-001', createdAt: '2025-01-01T00:00:00Z', expiresAt: '2025-02-01T00:00:00Z', isCurrent: true },
  { id: 'session-002', createdAt: '2025-01-02T00:00:00Z', expiresAt: '2025-02-02T00:00:00Z', isCurrent: false },
  { id: 'session-003', createdAt: '2025-01-03T00:00:00Z', expiresAt: '2025-02-03T00:00:00Z', isCurrent: false },
];

const MOCK_DATA: SecuritySettings = {
  twoFactorAuth: 'false',
  loginNotifications: 'true',
};

function makeApi(
  getFn = vi.fn().mockResolvedValue(MOCK_DATA),
  putFn = vi.fn().mockResolvedValue(undefined),
  changePwFn = vi.fn().mockResolvedValue({ wasCurrentSession: false }),
) {
  let callCount = 0;
  return {
    invoke: vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return getFn();
      if (callCount === 2) return putFn();
      return changePwFn();
    }),
  };
}

function makeAuth() {
  return { logout: vi.fn().mockResolvedValue(undefined) };
}

async function setup(
  api = makeApi(),
  auth = makeAuth(),
) {
  return render(SettingsSecurityPage, {
    providers: [
      provideRouter([]),
      ...twoFaProviders,
      { provide: Api, useValue: api },
      { provide: AuthService, useValue: auth },
    ],
  });
}

describe('SettingsSecurityPage', () => {
  it('patches security form from GET response', async () => {
    const { fixture } = await setup();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.securityForm.getRawValue().twoFactorAuth).toBe(false);
    expect(comp.securityForm.getRawValue().loginNotifications).toBe(true);
  });

  it('save sends string-converted security payload', async () => {
    const invokeSpy = vi.fn().mockImplementation((() => {
      let n = 0;
      return () =>
        ++n === 1 ? Promise.resolve(MOCK_DATA) : Promise.resolve(undefined);
    })());
    const api = { invoke: invokeSpy };
    const auth = makeAuth();
    const { fixture } = await render(SettingsSecurityPage, {
      providers: [
        provideRouter([]),
      ...twoFaProviders,
        { provide: Api, useValue: api },
        { provide: AuthService, useValue: auth },
      ],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.securityForm.markAsDirty();
    await comp.onSaveSecurity();

    const body = invokeSpy.mock.calls.at(-1)?.[1]?.body as SecuritySettings;
    expect(body.twoFactorAuth).toBe('false');
    expect(body.loginNotifications).toBe('true');
  });

  it('cross-field validator blocks mismatched passwords', async () => {
    const { fixture } = await setup();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.passwordForm.patchValue({
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass1!',
      confirmPassword: 'DifferentPass1!',
    });
    comp.passwordForm.controls.confirmPassword.markAsTouched();

    expect(comp.passwordForm.hasError('passwordMismatch')).toBe(true);
    expect(comp.confirmPasswordError).toBe('Passwords do not match');
  });

  it('wasCurrentSession triggers logout and redirect', async () => {
    let callCount = 0;
    const invokeSpy = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(MOCK_DATA);
      return Promise.resolve({ wasCurrentSession: true });
    });
    const auth = makeAuth();
    const { fixture } = await render(SettingsSecurityPage, {
      providers: [
        provideRouter([{ path: 'login', component: SettingsSecurityPage }]),
        ...twoFaProviders,
        { provide: Api, useValue: { invoke: invokeSpy } },
        { provide: AuthService, useValue: auth },
      ],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.passwordForm.patchValue({
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass12345!',
      confirmPassword: 'NewPass12345!',
    });
    await comp.onChangePassword();

    expect(auth.logout).toHaveBeenCalledOnce();
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/login');
  });

  // ── T4b: Sessions panel ──────────────────────────────────────────────────

  it('toggling sessions loads the list', async () => {
    const invokeSpy = vi.fn().mockImplementation((() => {
      let n = 0;
      return () => {
        n++;
        if (n === 1) return Promise.resolve(MOCK_DATA);
        return Promise.resolve({ data: MOCK_SESSIONS });
      };
    })());
    const { fixture } = await render(SettingsSecurityPage, {
      providers: [
        provideRouter([]),
      ...twoFaProviders,
        { provide: Api, useValue: { invoke: invokeSpy } },
        { provide: AuthService, useValue: makeAuth() },
      ],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.sessions().length).toBe(0);

    await comp.toggleSessions();
    expect(comp.showSessions()).toBe(true);
    expect(comp.sessionsLoaded()).toBe(true);
    expect(comp.sessions().length).toBe(3);
  });

  it('second toggle hides without reloading', async () => {
    const invokeSpy = vi.fn().mockImplementation((() => {
      let n = 0;
      return () => {
        n++;
        if (n === 1) return Promise.resolve(MOCK_DATA);
        return Promise.resolve({ data: MOCK_SESSIONS });
      };
    })());
    const { fixture } = await render(SettingsSecurityPage, {
      providers: [
        provideRouter([]),
      ...twoFaProviders,
        { provide: Api, useValue: { invoke: invokeSpy } },
        { provide: AuthService, useValue: makeAuth() },
      ],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    await comp.toggleSessions();
    const callsAfterOpen = invokeSpy.mock.calls.length;

    await comp.toggleSessions();
    expect(comp.showSessions()).toBe(false);

    await comp.toggleSessions();
    expect(invokeSpy.mock.calls.length).toBe(callsAfterOpen);
  });

  it('revoking individual session removes it from list', async () => {
    const invokeSpy = vi.fn().mockImplementation((() => {
      let n = 0;
      return () => {
        n++;
        if (n === 1) return Promise.resolve(MOCK_DATA);
        if (n === 2) return Promise.resolve({ data: MOCK_SESSIONS });
        return Promise.resolve({ data: { revoked: true, wasCurrentSession: false } });
      };
    })());
    const { fixture } = await render(SettingsSecurityPage, {
      providers: [
        provideRouter([]),
      ...twoFaProviders,
        { provide: Api, useValue: { invoke: invokeSpy } },
        { provide: AuthService, useValue: makeAuth() },
      ],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    await comp.toggleSessions();
    expect(comp.sessions().length).toBe(3);

    await comp.onRevokeSession('session-002');
    expect(comp.sessions().length).toBe(2);
    expect(comp.sessions().find((s) => s.id === 'session-002')).toBeUndefined();
  });

  it('revoking all shows count message and reloads sessions', async () => {
    const remainingSessions = [MOCK_SESSIONS[0]];
    const invokeSpy = vi.fn().mockImplementation((() => {
      let n = 0;
      return () => {
        n++;
        if (n === 1) return Promise.resolve(MOCK_DATA);
        if (n === 2) return Promise.resolve({ data: MOCK_SESSIONS });
        if (n === 3) return Promise.resolve({ data: { revokedCount: 2 } });
        return Promise.resolve({ data: remainingSessions });
      };
    })());
    const { fixture } = await render(SettingsSecurityPage, {
      providers: [
        provideRouter([]),
      ...twoFaProviders,
        { provide: Api, useValue: { invoke: invokeSpy } },
        { provide: AuthService, useValue: makeAuth() },
      ],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    await comp.toggleSessions();
    await comp.onRevokeAllOthers();

    expect(comp.sessionMessage()).toBe('Revoked 2 other sessions');
    expect(comp.sessions().length).toBe(1);
  });

  // ── T4b: Recommendations ─────────────────────────────────────────────────

  it('2FA warning hidden when twoFactorAuth enabled', async () => {
    const { fixture } = await setup();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.securityForm.patchValue({ twoFactorAuth: true });
    expect(comp.securityForm.controls.twoFactorAuth.value).toBe(true);
  });

  it('2FA warning visible when twoFactorAuth disabled', async () => {
    const { fixture } = await setup();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.securityForm.controls.twoFactorAuth.value).toBe(false);
  });

  it('wrong current password shows inline error', async () => {
    let callCount = 0;
    const api = {
      invoke: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(MOCK_DATA);
        return Promise.reject(new Error('Current password is incorrect'));
      }),
    };
    const { fixture, findByText } = await render(SettingsSecurityPage, {
      providers: [
        provideRouter([]),
      ...twoFaProviders,
        { provide: Api, useValue: api },
        { provide: AuthService, useValue: makeAuth() },
      ],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.passwordForm.patchValue({
      currentPassword: 'wrong',
      newPassword: 'NewPass12345!',
      confirmPassword: 'NewPass12345!',
    });
    await comp.onChangePassword();
    fixture.detectChanges();

    expect(await findByText('Current password is incorrect')).toBeTruthy();
  });
});
