import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { Api } from '@ng/core/api/generated/api';
import type { SystemSettings } from '@ng/core/api/generated/models/system-settings';
import { SettingsAppConfigPage } from './settings-app-config.page';

const MOCK_ADMIN_DATA: SystemSettings = {
  theme: 'dark',
  isAdmin: 'true',
  logLevel: 'warn',
};

function makeApi(data: SystemSettings = MOCK_ADMIN_DATA) {
  let callCount = 0;
  return {
    invoke: vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? Promise.resolve(data) : Promise.resolve(undefined);
    }),
  };
}

async function setup(data: SystemSettings = MOCK_ADMIN_DATA) {
  const api = makeApi(data);
  const result = await render(SettingsAppConfigPage, {
    providers: [
      provideRouter([]),
      { provide: Api, useValue: api },
    ],
  });
  return { ...result, api };
}

describe('SettingsAppConfigPage', () => {
  it('renders the organization settings card', async () => {
    const { fixture, findByText } = await setup();
    await fixture.whenStable();
    expect(await findByText('Admin Settings')).toBeTruthy();
  });

  it('patches form from GET response', async () => {
    const { fixture } = await setup();
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    expect(comp.form.getRawValue().logLevel).toBe('warn');
  });

  it('save sends the log level', async () => {
    const invokeSpy = vi.fn().mockImplementation((() => {
      let n = 0;
      return () => ++n === 1 ? Promise.resolve(MOCK_ADMIN_DATA) : Promise.resolve(undefined);
    })());
    const { fixture } = await render(SettingsAppConfigPage, {
      providers: [
        provideRouter([]),
        { provide: Api, useValue: { invoke: invokeSpy } },
      ],
    });
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.form.markAsDirty();
    await comp.onSave();
    const body = invokeSpy.mock.calls.at(-1)?.[1]?.body as SystemSettings;
    expect(body.logLevel).toBe('warn');
    expect(body.theme).toBeUndefined();
  });
});
