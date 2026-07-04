import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Api } from '@ng/core/api/generated/api';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';
import { ToastService } from '@ng/core/errors/toast.service';
import { ApiError } from '@ng/core/errors/api-error';
import { AcceptInvitePage } from './accept-invite.page';

function makeRoute(token: string | null) {
  return {
    snapshot: {
      queryParamMap: convertToParamMap(token ? { token } : {}),
    },
  };
}

function makeToast() {
  return { success: vi.fn(), error: vi.fn() };
}

async function setup(token: string | null = 'tok-123', api = { invoke: vi.fn() }) {
  return render(AcceptInvitePage, {
    providers: [
      provideRouter([{ path: 'login', component: AcceptInvitePage }]),
      provideHttpClient(),
      { provide: ApiConfiguration, useValue: { rootUrl: '/api' } },
      { provide: Api, useValue: api },
      { provide: ActivatedRoute, useValue: makeRoute(token) },
      { provide: ToastService, useValue: makeToast() },
    ],
  });
}

describe('AcceptInvitePage', () => {
  it('shows the invalid-link state when there is no token', async () => {
    const { fixture } = await setup(null);
    await fixture.whenStable();
    expect(fixture.componentInstance.hasToken()).toBe(false);
  });

  it('submits the token and password, then navigates to /login', async () => {
    const invokeSpy = vi.fn().mockResolvedValue({ data: { message: 'ok', email: 'x@y.com' } });
    const { fixture } = await setup('tok-123', { invoke: invokeSpy });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.form.setValue({ password: 'StrongPass123!', confirmPassword: 'StrongPass123!' });
    await comp.onSubmit();

    const body = invokeSpy.mock.calls.at(-1)?.[1]?.body;
    expect(body).toEqual({ token: 'tok-123', password: 'StrongPass123!' });
  });

  it('does not submit when passwords do not match', async () => {
    const invokeSpy = vi.fn().mockResolvedValue({ data: {} });
    const { fixture } = await setup('tok-123', { invoke: invokeSpy });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.form.setValue({ password: 'StrongPass123!', confirmPassword: 'Different123!' });
    await comp.onSubmit();

    expect(invokeSpy).not.toHaveBeenCalled();
  });

  it('shows a specific message for an already-accepted invite (409)', async () => {
    const invokeSpy = vi.fn().mockRejectedValue(new ApiError(409, 'CONFLICT', 'already accepted'));
    const { fixture } = await setup('tok-123', { invoke: invokeSpy });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.form.setValue({ password: 'StrongPass123!', confirmPassword: 'StrongPass123!' });
    await comp.onSubmit();

    expect(comp.errorMessage()).toBe('This invitation has already been accepted.');
  });
});
