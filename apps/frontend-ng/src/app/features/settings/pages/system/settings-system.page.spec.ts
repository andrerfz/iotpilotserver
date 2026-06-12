import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { Api } from '@ng/core/api/generated/api';
import { ThemeService } from '@ng/shared/ui/theme/theme.service';
import type { SystemSettings } from '@ng/core/api/generated/models/system-settings';
import { SettingsSystemPage } from './settings-system.page';

const MOCK_USER_DATA: SystemSettings = {
  theme: 'light',
  dashboardLayout: 'default',
  itemsPerPage: '10',
  isAdmin: 'false',
};

const MOCK_ADMIN_DATA: SystemSettings = {
  ...MOCK_USER_DATA,
  isAdmin: 'true',
  enableAdvancedMetrics: 'false',
  enableBetaFeatures: 'true',
  logLevel: 'warn',
};

function makeApi(data: SystemSettings = MOCK_USER_DATA) {
  let callCount = 0;
  return {
    invoke: vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? Promise.resolve(data) : Promise.resolve(undefined);
    }),
  };
}

function makeTheme() {
  const setThemeSpy = vi.fn();
  return {
    theme: vi.fn().mockReturnValue('light'),
    setTheme: setThemeSpy,
  };
}

async function setup(data: SystemSettings = MOCK_USER_DATA) {
  const api = makeApi(data);
  const theme = makeTheme();
  const result = await render(SettingsSystemPage, {
    providers: [
      provideRouter([]),
      { provide: Api, useValue: api },
      { provide: ThemeService, useValue: theme },
    ],
  });
  return { ...result, api, theme };
}

describe('SettingsSystemPage', () => {
  it('renders display section for all users', async () => {
    const { fixture, findByText } = await setup();
    await fixture.whenStable();

    expect(await findByText('Display Settings')).toBeTruthy();
  });

  it('patches display form from GET response', async () => {
    const { fixture } = await setup();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.displayForm.getRawValue().dashboardLayout).toBe('default');
    expect(comp.displayForm.getRawValue().itemsPerPage).toBe('10');
  });

  it('admin section hidden when isAdmin is false', async () => {
    const { fixture } = await setup(MOCK_USER_DATA);
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.isAdmin()).toBe(false);
  });

  it('admin section shown when isAdmin is true', async () => {
    const { fixture } = await setup(MOCK_ADMIN_DATA);
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.isAdmin()).toBe(true);
    expect(comp.adminForm.getRawValue().enableAdvancedMetrics).toBe(false);
    expect(comp.adminForm.getRawValue().enableBetaFeatures).toBe(true);
    expect(comp.adminForm.getRawValue().logLevel).toBe('warn');
  });

  it('theme change calls ThemeService.setTheme, not api.invoke directly', async () => {
    const { fixture, api, theme } = await setup();
    await fixture.whenStable();

    const invokesBeforeThemeChange = api.invoke.mock.calls.length;

    const comp = fixture.componentInstance;
    comp.onThemeChange(new CustomEvent('ionChange', { detail: { value: 'dark' } }));

    expect(theme.setTheme).toHaveBeenCalledWith('dark');
    expect(api.invoke.mock.calls.length).toBe(invokesBeforeThemeChange);
  });

  it('save display sends payload without theme field', async () => {
    const invokeSpy = vi.fn().mockImplementation((() => {
      let n = 0;
      return () =>
        ++n === 1 ? Promise.resolve(MOCK_USER_DATA) : Promise.resolve(undefined);
    })());
    const theme = makeTheme();
    const { fixture } = await render(SettingsSystemPage, {
      providers: [
        provideRouter([]),
        { provide: Api, useValue: { invoke: invokeSpy } },
        { provide: ThemeService, useValue: theme },
      ],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.displayForm.markAsDirty();
    await comp.onSaveDisplay();

    const body = invokeSpy.mock.calls.at(-1)?.[1]?.body as SystemSettings;
    expect(body.dashboardLayout).toBe('default');
    expect(body.itemsPerPage).toBe('10');
    expect(body.theme).toBeUndefined();
  });

  it('save admin sends string-converted boolean payload', async () => {
    const invokeSpy = vi.fn().mockImplementation((() => {
      let n = 0;
      return () =>
        ++n === 1 ? Promise.resolve(MOCK_ADMIN_DATA) : Promise.resolve(undefined);
    })());
    const theme = makeTheme();
    const { fixture } = await render(SettingsSystemPage, {
      providers: [
        provideRouter([]),
        { provide: Api, useValue: { invoke: invokeSpy } },
        { provide: ThemeService, useValue: theme },
      ],
    });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.adminForm.markAsDirty();
    await comp.onSaveAdmin();

    const body = invokeSpy.mock.calls.at(-1)?.[1]?.body as SystemSettings;
    expect(body.enableAdvancedMetrics).toBe('false');
    expect(body.enableBetaFeatures).toBe('true');
    expect(body.logLevel).toBe('warn');
  });
});
