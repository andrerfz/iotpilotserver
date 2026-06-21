import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '@ng/core/auth/auth.service';
import { ToastService } from '@ng/core/errors/toast.service';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';
import { User } from '@ng/core/api/generated/models/user';
import { LoginPage } from './login.page';

const fakeUser: User = {
  id: 'usr_1',
  email: 'u@test.com',
  username: 'user',
  role: 'USER',
  customerId: 'c1',
};

const fakeToast = { success: vi.fn().mockResolvedValue(undefined) };

async function setup(
  loginFn: ReturnType<typeof vi.fn>,
  verifyFn: ReturnType<typeof vi.fn> = vi.fn(),
) {
  return render(LoginPage, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      { provide: ApiConfiguration, useValue: { rootUrl: '/api' } },
      { provide: AuthService, useValue: { login: loginFn, verifyTwoFactor: verifyFn } },
      { provide: ToastService, useValue: fakeToast },
    ],
  });
}

// ─── Credentials step ─────────────────────────────────────────────────────────

describe('LoginPage — credentials step', () => {
  it('does not call AuthService.login when form is empty (invalid)', async () => {
    const loginFn = vi.fn();
    const view = await setup(loginFn);
    await view.fixture.componentInstance.onSubmit();
    expect(loginFn).not.toHaveBeenCalled();
  });

  it('navigates to /app after a successful login', async () => {
    const loginFn = vi.fn().mockResolvedValue({ status: 'authenticated', user: fakeUser });
    const view = await setup(loginFn);
    const router = view.debugElement.injector.get(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    view.fixture.componentInstance.form.setValue({
      email: 'u@test.com',
      password: 'Valid1234!',
      remember: false,
    });
    await view.fixture.componentInstance.onSubmit();

    expect(navSpy).toHaveBeenCalledWith('/app');
  });

  it('shows an inline error when login throws', async () => {
    const loginFn = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    const view = await setup(loginFn);

    view.fixture.componentInstance.form.setValue({
      email: 'u@test.com',
      password: 'wrong',
      remember: false,
    });
    await view.fixture.componentInstance.onSubmit();
    view.fixture.detectChanges();

    expect(view.container.textContent).toContain('Invalid credentials');
  });
});

// ─── 2FA step ─────────────────────────────────────────────────────────────────

describe('LoginPage — 2FA step', () => {
  it('switches to the 2FA step when login returns requires-2fa', async () => {
    const loginFn = vi.fn().mockResolvedValue({ status: 'requires-2fa', userId: 'usr_2fa' });
    const view = await setup(loginFn);
    const page = view.fixture.componentInstance;

    page.form.setValue({ email: 'u@test.com', password: 'pass', remember: false });
    await page.onSubmit();

    expect(page.step()).toBe('2fa');
    expect(fakeToast.success).toHaveBeenCalledWith('Verification code sent to your email.');
  });

  it('back button resets to the credentials step and clears the code', async () => {
    const loginFn = vi.fn().mockResolvedValue({ status: 'requires-2fa', userId: 'usr_2fa' });
    const view = await setup(loginFn);
    const page = view.fixture.componentInstance;

    page.form.setValue({ email: 'u@test.com', password: 'pass', remember: false });
    await page.onSubmit();
    page.code.set('123456');
    page.onBack();

    expect(page.step()).toBe('credentials');
    expect(page.code()).toBe('');
  });

  it('navigates to /app after verifyTwoFactor succeeds', async () => {
    const loginFn = vi.fn().mockResolvedValue({ status: 'requires-2fa', userId: 'usr_2fa' });
    const verifyFn = vi.fn().mockResolvedValue(fakeUser);
    const view = await setup(loginFn, verifyFn);
    const router = view.debugElement.injector.get(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const page = view.fixture.componentInstance;

    page.form.setValue({ email: 'u@test.com', password: 'pass', remember: false });
    await page.onSubmit();
    page.code.set('654321');
    await page.onVerify();

    expect(verifyFn).toHaveBeenCalledWith('usr_2fa', '654321', false);
    expect(navSpy).toHaveBeenCalledWith('/app');
  });

  it('clears the code and shows an error when verifyTwoFactor throws', async () => {
    const loginFn = vi.fn().mockResolvedValue({ status: 'requires-2fa', userId: 'usr_2fa' });
    const verifyFn = vi.fn().mockRejectedValue(new Error('Invalid code'));
    const view = await setup(loginFn, verifyFn);
    const page = view.fixture.componentInstance;

    page.form.setValue({ email: 'u@test.com', password: 'pass', remember: false });
    await page.onSubmit();
    page.code.set('000000');
    await page.onVerify();
    view.fixture.detectChanges();

    expect(page.code()).toBe('');
    expect(view.container.textContent).toContain('Invalid code');
  });
});
