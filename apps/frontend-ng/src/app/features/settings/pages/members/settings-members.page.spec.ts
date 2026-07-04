import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { Api } from '@ng/core/api/generated/api';
import { AuthService } from '@ng/core/auth/auth.service';
import { AlertController } from '@ng/shared/ui';
import type { UserResponse } from '@ng/core/api/generated/models/user-response';
import { SettingsMembersPage } from './settings-members.page';

const MOCK_MEMBERS: UserResponse[] = [
  { id: 'u-1', email: 'admin@example.com', username: 'admin', role: 'ADMIN', customerId: 'c-1', status: 'ACTIVE' },
  { id: 'u-2', email: 'invitee@example.com', username: 'invitee', role: 'USER', customerId: 'c-1', status: 'PENDING' },
];

function makeApi(getFn = vi.fn().mockResolvedValue({ data: MOCK_MEMBERS })) {
  return { invoke: vi.fn().mockImplementation((fn: unknown) => getFn(fn)) };
}

function makeAuth(currentId = 'u-1') {
  return { currentUser: () => ({ id: currentId }) };
}

async function setup(api = makeApi(), auth = makeAuth()) {
  return render(SettingsMembersPage, {
    providers: [
      provideRouter([]),
      { provide: Api, useValue: api },
      { provide: AuthService, useValue: auth },
      { provide: AlertController, useValue: { create: vi.fn().mockResolvedValue({ present: vi.fn() }) } },
    ],
  });
}

describe('SettingsMembersPage', () => {
  it('loads and displays members', async () => {
    const { fixture, findByText } = await setup();
    await fixture.whenStable();
    expect(await findByText('admin@example.com')).toBeTruthy();
    expect(await findByText('invitee@example.com')).toBeTruthy();
  });

  it('canManage is false for self and for SUPERADMIN rows', async () => {
    const { fixture } = await setup();
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    expect(comp.canManage(MOCK_MEMBERS[0])).toBe(false); // self (u-1)
    expect(comp.canManage(MOCK_MEMBERS[1])).toBe(true);
    expect(comp.canManage({ ...MOCK_MEMBERS[1], role: 'SUPERADMIN' })).toBe(false);
  });

  it('onInvite calls inviteUser with the form payload and reloads', async () => {
    const invokeSpy = vi.fn().mockImplementation((fn: { PATH?: string }) => {
      if (fn?.PATH === '/users/invite') return Promise.resolve({ data: { id: 'u-3', email: 'x@y.com', role: 'USER', status: 'PENDING' } });
      return Promise.resolve({ data: MOCK_MEMBERS });
    });
    const { fixture } = await render(SettingsMembersPage, {
      providers: [
        provideRouter([]),
        { provide: Api, useValue: { invoke: invokeSpy } },
        { provide: AuthService, useValue: makeAuth() },
        { provide: AlertController, useValue: { create: vi.fn() } },
      ],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.inviteForm.setValue({ email: 'x@y.com', role: 'USER' });
    await comp.onInvite();

    const inviteCall = invokeSpy.mock.calls.find((c) => (c[0] as { PATH?: string })?.PATH === '/users/invite');
    expect(inviteCall?.[1]?.body).toEqual({ email: 'x@y.com', role: 'USER' });
    expect(comp.showInviteModal()).toBe(false);
  });

  it('surfaces an error when loading fails', async () => {
    const api = { invoke: vi.fn().mockRejectedValue(new Error('boom')) };
    const { fixture } = await setup(api);
    await fixture.whenStable();
    expect(fixture.componentInstance.listError()).toBe('boom');
  });
});
