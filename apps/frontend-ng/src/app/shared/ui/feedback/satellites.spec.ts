import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { AppLogoComponent } from '../brand/app-logo.component';
import { NetworkStatusComponent } from './network-status.component';
import { MaintenanceBannerComponent } from './maintenance-banner.component';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';

const LOGO_PROVIDERS = [
  provideHttpClient(),
  { provide: ApiConfiguration, useValue: { rootUrl: '/api' } },
];

describe('AppLogoComponent', () => {
  it('renders the brand mark', async () => {
    const { container } = await render(AppLogoComponent, { providers: LOGO_PROVIDERS });
    expect(container.querySelector('.brand-mark')).toBeTruthy();
  });

  it('renders the subtitle by default', async () => {
    const { container } = await render(AppLogoComponent, { providers: LOGO_PROVIDERS });
    expect(container.querySelector('.brand-sub')?.textContent?.trim()).toBe('ops console');
  });

  it('hides the subtitle when showText is false', async () => {
    const { container } = await render(AppLogoComponent, {
      inputs: { showText: false },
      providers: LOGO_PROVIDERS,
    });
    expect(container.querySelector('.brand-mark')).toBeTruthy();
    expect(container.querySelector('.brand-sub')).toBeFalsy();
  });

  it('accepts a custom subtitle', async () => {
    const { container } = await render(AppLogoComponent, {
      inputs: { sub: 'custom sub' },
      providers: LOGO_PROVIDERS,
    });
    expect(container.querySelector('.brand-sub')?.textContent?.trim()).toBe('custom sub');
  });
});

describe('NetworkStatusComponent', () => {
  it('renders nothing while online', async () => {
    const { container } = await render(NetworkStatusComponent);
    expect(container.querySelector('.netbar')).toBeFalsy();
  });

  it('shows the offline banner on the window offline event', async () => {
    const { container, fixture } = await render(NetworkStatusComponent);
    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();
    expect(container.querySelector('.netbar')).toBeTruthy();
    expect(container.textContent).toContain('offline');
    // recovers when back online
    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();
    expect(container.querySelector('.netbar')).toBeFalsy();
  });
});

describe('MaintenanceBannerComponent', () => {
  it('is hidden when message is empty', async () => {
    const { container } = await render(MaintenanceBannerComponent, { inputs: { message: '' } });
    expect(container.querySelector('.maint')).toBeFalsy();
  });

  it('shows the banner with the message when set', async () => {
    const { container } = await render(MaintenanceBannerComponent, {
      inputs: { message: 'Scheduled maintenance at 02:00 UTC' },
    });
    expect(container.querySelector('.maint')?.textContent).toContain('Scheduled maintenance');
  });
});
