import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { DeviceTabNavComponent } from './device-tab-nav.component';

async function renderNav(deviceId = 'dev-1', openAlertCount = 0, deviceType = '') {
  return render(DeviceTabNavComponent, {
    imports: [RouterTestingModule],
    inputs: { deviceId, openAlertCount, deviceType },
  });
}

describe('DeviceTabNavComponent', () => {
  describe('navItems — flat tab list', () => {
    it('includes overview, metrics and alerts for default deviceType', async () => {
      const { fixture } = await renderNav();
      const values = fixture.componentInstance.navItems().map(i => i.value);
      expect(values).toContain('');           // overview
      expect(values).toContain('metrics');
      expect(values).toContain('alerts');
      expect(values).toContain('logs');
      expect(values).toContain('settings');
    });

    it('excludes terminal when deviceType does not have SSH', async () => {
      const { fixture } = await renderNav('dev-1', 0, '');
      const values = fixture.componentInstance.navItems().map(i => i.value);
      expect(values).not.toContain('terminal');
    });

    it('excludes network and storage when deviceType has no system info', async () => {
      // ESP8266_SENSOR has systemInfo: false in the capability registry
      const { fixture } = await renderNav('dev-1', 0, 'ESP8266_SENSOR');
      const values = fixture.componentInstance.navItems().map(i => i.value);
      expect(values).not.toContain('network');
      expect(values).not.toContain('storage');
    });
  });

  describe('alert badge', () => {
    it('alerts item has no badge when openAlertCount is 0', async () => {
      const { fixture } = await renderNav('dev-1', 0);
      const alertItem = fixture.componentInstance.navItems().find(i => i.value === 'alerts');
      expect(alertItem?.badge).toBeUndefined();
    });

    it('alerts item badge equals openAlertCount when > 0', async () => {
      const { fixture } = await renderNav('dev-1', 5);
      const alertItem = fixture.componentInstance.navItems().find(i => i.value === 'alerts');
      expect(alertItem?.badge).toBe(5);
    });
  });

  describe('navigation', () => {
    it('navigates to /app/devices/:id for overview tab (empty path)', async () => {
      const { fixture } = await renderNav('dev-1');
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      fixture.componentInstance.onTabSelect('');
      expect(spy).toHaveBeenCalledWith(['/app/devices', 'dev-1']);
    });

    it('navigates to /app/devices/:id/metrics for metrics tab', async () => {
      const { fixture } = await renderNav('dev-1');
      const router = TestBed.inject(Router);
      const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      fixture.componentInstance.onTabSelect('metrics');
      expect(spy).toHaveBeenCalledWith(['/app/devices', 'dev-1', 'metrics']);
    });

    it('activeValue reflects the current child path', async () => {
      const { fixture } = await renderNav('dev-1');
      // RouterTestingModule starts at '/', so segments[3] === '' (overview)
      expect(fixture.componentInstance.activeValue()).toBe('');
    });
  });

  describe('ui-nav-select integration', () => {
    it('renders a ui-nav-select element', async () => {
      const { container } = await renderNav();
      expect(container.querySelector('ui-nav-select')).toBeTruthy();
    });
  });
});
