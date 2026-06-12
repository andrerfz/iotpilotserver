import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { Api } from '@ng/core/api/generated/api';
import type { NotificationSettings } from '@ng/core/api/generated/models/notification-settings';
import { SettingsNotificationsPage } from './settings-notifications.page';

const MOCK_DATA: NotificationSettings = {
  emailNotifications: 'true',
  pushNotifications: 'false',
  alertNotifications: 'true',
  deviceOfflineNotifications: 'false',
};

function makeApi(
  getFn = vi.fn().mockResolvedValue(MOCK_DATA),
  putFn = vi.fn().mockResolvedValue(undefined),
) {
  let callCount = 0;
  return {
    invoke: vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? getFn() : putFn();
    }),
  };
}

async function setup(api = makeApi()) {
  return render(SettingsNotificationsPage, {
    providers: [provideRouter([]), { provide: Api, useValue: api }],
  });
}

describe('SettingsNotificationsPage', () => {
  it('patches toggles to boolean from string API response', async () => {
    const { fixture } = await setup();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.form.getRawValue().emailNotifications).toBe(true);
    expect(comp.form.getRawValue().pushNotifications).toBe(false);
    expect(comp.form.getRawValue().alertNotifications).toBe(true);
    expect(comp.form.getRawValue().deviceOfflineNotifications).toBe(false);
  });

  it('save button sends string-converted payload', async () => {
    const invokeSpy = vi.fn().mockImplementation((() => {
      let n = 0;
      return () => (++n === 1 ? Promise.resolve(MOCK_DATA) : Promise.resolve(undefined));
    })());
    const api = { invoke: invokeSpy };
    const { fixture } = await render(SettingsNotificationsPage, {
      providers: [provideRouter([]), { provide: Api, useValue: api }],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.form.markAsDirty();
    await comp.onSave();

    const body = invokeSpy.mock.calls.at(-1)?.[1]?.body as NotificationSettings;
    expect(body.emailNotifications).toBe('true');
    expect(body.pushNotifications).toBe('false');
    expect(body.alertNotifications).toBe('true');
    expect(body.deviceOfflineNotifications).toBe('false');
  });

  it('shows inline error when load fails', async () => {
    const api = {
      invoke: vi.fn().mockRejectedValue(new Error('Load failed')),
    };
    const { fixture, findByText } = await render(SettingsNotificationsPage, {
      providers: [provideRouter([]), { provide: Api, useValue: api }],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(await findByText('Failed to load notification settings')).toBeTruthy();
  });

  it('shows success message after save', async () => {
    const { fixture, findByText } = await setup();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.form.markAsDirty();
    await comp.onSave();
    fixture.detectChanges();

    expect(await findByText('Notification settings updated successfully')).toBeTruthy();
  });

  it('shows inline error when save fails', async () => {
    let callCount = 0;
    const api = {
      invoke: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1
          ? Promise.resolve(MOCK_DATA)
          : Promise.reject(new Error('Save failed'));
      }),
    };
    const { fixture, findByText } = await render(SettingsNotificationsPage, {
      providers: [provideRouter([]), { provide: Api, useValue: api }],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.form.markAsDirty();
    await comp.onSave();
    fixture.detectChanges();

    expect(await findByText('Save failed')).toBeTruthy();
  });
});
