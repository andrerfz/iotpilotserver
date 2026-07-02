import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { Api } from '@ng/core/api/generated/api';
import { ThemeService } from '@ng/shared/ui/theme/theme.service';
import { signal } from '@angular/core';
import type { SystemSettings } from '@ng/core/api/generated/models/system-settings';
import { SettingsPreferencesPage } from './settings-preferences.page';

const MOCK_DATA: SystemSettings = {
  theme: 'dark',
  dashboardLayout: 'compact',
  itemsPerPage: '25',
  isAdmin: 'false',
};

function makeApi(data: SystemSettings = MOCK_DATA) {
  let callCount = 0;
  return {
    invoke: vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? Promise.resolve(data) : Promise.resolve(undefined);
    }),
  };
}

function makeTheme(current: 'light' | 'dark' | 'system' = 'dark') {
  return {
    theme: signal(current),
    setTheme: vi.fn(),
  };
}

async function setup(data: SystemSettings = MOCK_DATA) {
  const api = makeApi(data);
  const theme = makeTheme();
  const result = await render(SettingsPreferencesPage, {
    providers: [
      provideRouter([]),
      { provide: Api, useValue: api },
      { provide: ThemeService, useValue: theme },
    ],
  });
  return { ...result, api, theme };
}

describe('SettingsPreferencesPage', () => {
  it('renders the display settings card', async () => {
    const { fixture, findByText } = await setup();
    await fixture.whenStable();
    expect(await findByText('Display Settings')).toBeTruthy();
  });

  it('patches form from GET response', async () => {
    const { fixture } = await setup();
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    expect(comp.form.getRawValue().dashboardLayout).toBe('compact');
    expect(comp.form.getRawValue().itemsPerPage).toBe('25');
  });

  it('theme change calls ThemeService.setTheme, not api.invoke directly', async () => {
    const { fixture, api, theme } = await setup();
    await fixture.whenStable();
    const invokesBeforeChange = api.invoke.mock.calls.length;
    fixture.componentInstance.onThemeChange(
      new CustomEvent('ionChange', { detail: { value: 'light' } }),
    );
    expect(theme.setTheme).toHaveBeenCalledWith('light');
    expect(api.invoke.mock.calls.length).toBe(invokesBeforeChange);
  });

  it('save sends payload including the current theme', async () => {
    const invokeSpy = vi.fn().mockImplementation((() => {
      let n = 0;
      return () => ++n === 1 ? Promise.resolve(MOCK_DATA) : Promise.resolve(undefined);
    })());
    const { fixture } = await render(SettingsPreferencesPage, {
      providers: [
        provideRouter([]),
        { provide: Api, useValue: { invoke: invokeSpy } },
        { provide: ThemeService, useValue: makeTheme() },
      ],
    });
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.form.markAsDirty();
    await comp.onSave();
    const body = invokeSpy.mock.calls.at(-1)?.[1]?.body as SystemSettings;
    expect(body.dashboardLayout).toBe('compact');
    expect(body.itemsPerPage).toBe('25');
    expect(body.theme).toBe('dark');
  });
});
