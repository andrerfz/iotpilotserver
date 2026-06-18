import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { DeviceTabNavComponent } from './device-tab-nav.component';

async function renderNav(deviceId = 'dev-1', openAlertCount = 0, deviceType = '') {
  return render(DeviceTabNavComponent, {
    imports: [RouterTestingModule],
    inputs: { deviceId, openAlertCount, deviceType },
  });
}

describe('DeviceTabNavComponent', () => {
  describe('group segments', () => {
    it('shows the 3 group labels: Monitor, Operate, System', async () => {
      await renderNav();
      expect(screen.getByText('Monitor')).toBeTruthy();
      expect(screen.getByText('Operate')).toBeTruthy();
      expect(screen.getByText('System')).toBeTruthy();
    });
  });

  describe('default active group (Monitor)', () => {
    it('shows Overview, Metrics and Alerts tabs by default', async () => {
      await renderNav();
      expect(screen.getByText('Overview')).toBeTruthy();
      expect(screen.getByText('Metrics')).toBeTruthy();
      expect(screen.getByText('Alerts')).toBeTruthy();
    });

    it('does not show Operate or System tabs until group is switched', async () => {
      const { container } = await renderNav();
      const tabTexts = Array.from(container.querySelectorAll('.device-tabs__tab')).map(t => t.textContent?.trim());
      expect(tabTexts).not.toContain('Commands');
      expect(tabTexts).not.toContain('Logs');
      expect(tabTexts).not.toContain('Network');
    });
  });

  describe('alert badge', () => {
    it('does not show badge when openAlertCount is 0', async () => {
      const { container } = await renderNav('dev-1', 0);
      expect(container.querySelector('.device-tabs__badge')).toBeNull();
    });

    it('shows badge with count when openAlertCount > 0', async () => {
      const { container } = await renderNav('dev-1', 3);
      const badge = container.querySelector('.device-tabs__badge');
      expect(badge).toBeTruthy();
      expect(badge?.textContent?.trim()).toBe('3');
    });
  });

  describe('tab links', () => {
    it('overview tab link contains the device id', async () => {
      const { container } = await renderNav('dev-1');
      const tabs = container.querySelectorAll('.device-tabs__tab');
      const overviewTab = Array.from(tabs).find(t => t.textContent?.trim() === 'Overview');
      expect(overviewTab?.getAttribute('href')).toContain('dev-1');
    });

    it('alerts tab link includes /alerts segment', async () => {
      const { container } = await renderNav('dev-1');
      const tabs = container.querySelectorAll('.device-tabs__tab');
      const alertsTab = Array.from(tabs).find(t => t.textContent?.trim().startsWith('Alerts'));
      expect(alertsTab?.getAttribute('href')).toContain('/alerts');
    });
  });
});
