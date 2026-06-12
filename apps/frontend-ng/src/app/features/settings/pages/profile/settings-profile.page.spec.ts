import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { Api } from '@ng/core/api/generated/api';
import type { ProfileSettingsResponse } from '@ng/core/api/generated/models/profile-settings-response';
import { SettingsProfilePage } from './settings-profile.page';

const MOCK_PROFILE: ProfileSettingsResponse = {
  email: 'user@example.com',
  username: 'testuser',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phoneNumber: '555-0100',
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
};

function makeApi(getFn = vi.fn().mockResolvedValue(MOCK_PROFILE)) {
  return { invoke: getFn };
}

async function setup(api = makeApi()) {
  return render(SettingsProfilePage, {
    providers: [
      provideRouter([]),
      { provide: Api, useValue: api },
    ],
  });
}

describe('SettingsProfilePage', () => {
  it('patches both forms from GET response', async () => {
    const { fixture, findByDisplayValue } = await setup();
    await fixture.whenStable();

    expect(await findByDisplayValue('Ada')).toBeTruthy();
    expect(await findByDisplayValue('Lovelace')).toBeTruthy();
    expect(await findByDisplayValue('555-0100')).toBeTruthy();
  });

  it('displays read-only email and username', async () => {
    const { fixture, findByText } = await setup();
    await fixture.whenStable();

    expect(await findByText('user@example.com')).toBeTruthy();
    expect(await findByText('testuser')).toBeTruthy();
  });

  it('onSavePersonal sends merged payload including display prefs', async () => {
    let callCount = 0;
    const api = {
      invoke: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? Promise.resolve(MOCK_PROFILE) : Promise.resolve(undefined);
      }),
    };
    const { fixture } = await setup(api);
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.personalForm.patchValue({ firstName: 'Updated' });
    comp.personalForm.markAsDirty();
    await comp.onSavePersonal();

    const lastCall = api.invoke.mock.calls.at(-1) as [unknown, { body: ProfileSettingsResponse }];
    const body = lastCall[1].body;
    expect(body.firstName).toBe('Updated');
    expect(body.language).toBe('en');
    expect(body.timezone).toBe('UTC');
  });

  it('onSaveDisplay sends merged payload including personal values', async () => {
    let callCount = 0;
    const api = {
      invoke: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? Promise.resolve(MOCK_PROFILE) : Promise.resolve(undefined);
      }),
    };
    const { fixture } = await setup(api);
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.displayForm.patchValue({ language: 'es' });
    comp.displayForm.markAsDirty();
    await comp.onSaveDisplay();

    const lastCall = api.invoke.mock.calls.at(-1) as [unknown, { body: ProfileSettingsResponse }];
    const body = lastCall[1].body;
    expect(body.language).toBe('es');
    expect(body.firstName).toBe('Ada');
    expect(body.lastName).toBe('Lovelace');
  });

  it('shows inline success after personal save', async () => {
    let callCount = 0;
    const api = {
      invoke: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? Promise.resolve(MOCK_PROFILE) : Promise.resolve(undefined);
      }),
    };
    const { fixture, findByText } = await setup(api);
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.personalForm.markAsDirty();
    await comp.onSavePersonal();
    fixture.detectChanges();

    expect(await findByText('Personal information saved')).toBeTruthy();
  });

  it('shows inline success after display save', async () => {
    let callCount = 0;
    const api = {
      invoke: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? Promise.resolve(MOCK_PROFILE) : Promise.resolve(undefined);
      }),
    };
    const { fixture, findByText } = await setup(api);
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.displayForm.markAsDirty();
    await comp.onSaveDisplay();
    fixture.detectChanges();

    expect(await findByText('Display preferences saved')).toBeTruthy();
  });

  it('shows inline error when personal save fails', async () => {
    let callCount = 0;
    const api = {
      invoke: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1
          ? Promise.resolve(MOCK_PROFILE)
          : Promise.reject(new Error('Network error'));
      }),
    };
    const { fixture, findByText } = await setup(api);
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.personalForm.markAsDirty();
    await comp.onSavePersonal();
    fixture.detectChanges();

    expect(await findByText('Network error')).toBeTruthy();
  });
});
