import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Api } from '@ng/core/api/generated/api';
import { ApiError } from '@ng/core/errors/api-error';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';
import { ToastService } from '@ng/core/errors/toast.service';
import { RegisterPage } from './register.page';

const fakeToast = { success: vi.fn().mockResolvedValue(undefined) };

function makeApi(invokeFn: ReturnType<typeof vi.fn>) {
  return { invoke: invokeFn };
}

async function setup(invokeFn: ReturnType<typeof vi.fn>) {
  return render(RegisterPage, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      { provide: ApiConfiguration, useValue: { rootUrl: '/api' } },
      { provide: Api, useValue: makeApi(invokeFn) },
      { provide: ToastService, useValue: fakeToast },
    ],
  });
}

function fillForm(page: RegisterPage, overrides: Partial<Record<'username' | 'email' | 'password' | 'confirmPassword', string>> = {}) {
  page.form.setValue({
    username: overrides.username ?? 'alice',
    email: overrides.email ?? 'alice@test.com',
    password: overrides.password ?? 'ValidPassword12!',
    confirmPassword: overrides.confirmPassword ?? 'ValidPassword12!',
  });
}

describe('RegisterPage', () => {
  it('does not call api.invoke when the form is invalid (empty)', async () => {
    const invokeFn = vi.fn();
    const view = await setup(invokeFn);
    await view.fixture.componentInstance.onSubmit();
    expect(invokeFn).not.toHaveBeenCalled();
  });

  it('does not submit when passwords do not match', async () => {
    const invokeFn = vi.fn();
    const view = await setup(invokeFn);
    fillForm(view.fixture.componentInstance, { confirmPassword: 'DifferentPass12!' });
    await view.fixture.componentInstance.onSubmit();
    expect(invokeFn).not.toHaveBeenCalled();
  });

  it('shows inline 409 error for duplicate email', async () => {
    const err = new ApiError(409, 'CONFLICT', 'Email already in use');
    const invokeFn = vi.fn().mockRejectedValue(err);
    const view = await setup(invokeFn);
    fillForm(view.fixture.componentInstance);
    await view.fixture.componentInstance.onSubmit();
    view.fixture.detectChanges();
    expect(view.container.textContent).toContain('An account with this email already exists.');
  });

  it('toasts "administrator will review" and navigates to /login when requiresApproval', async () => {
    const invokeFn = vi.fn().mockResolvedValue({ data: { requiresApproval: true } });
    const view = await setup(invokeFn);
    const router = view.debugElement.injector.get(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fillForm(view.fixture.componentInstance);
    await view.fixture.componentInstance.onSubmit();
    expect(fakeToast.success).toHaveBeenCalledWith(
      'Registration submitted. An administrator will review your account.',
    );
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('toasts "account created" and navigates to /login on normal registration', async () => {
    const invokeFn = vi.fn().mockResolvedValue({ data: { requiresApproval: false } });
    const view = await setup(invokeFn);
    const router = view.debugElement.injector.get(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fillForm(view.fixture.componentInstance);
    await view.fixture.componentInstance.onSubmit();
    expect(fakeToast.success).toHaveBeenCalledWith('Account created successfully. You can now log in.');
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });
});
