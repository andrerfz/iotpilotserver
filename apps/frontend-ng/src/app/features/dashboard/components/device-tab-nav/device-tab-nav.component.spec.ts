import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { DeviceTabNavComponent } from './device-tab-nav.component';

async function renderNav(deviceId = 'dev-1', openAlertCount = 0) {
  return render(DeviceTabNavComponent, {
    imports: [RouterTestingModule],
    inputs: { deviceId, openAlertCount },
  });
}

describe('DeviceTabNavComponent', () => {
  it('renders all 6 tabs', async () => {
    await renderNav();
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Alerts')).toBeTruthy();
    expect(screen.getByText('Commands')).toBeTruthy();
    expect(screen.getByText('Logs')).toBeTruthy();
    expect(screen.getByText('Network')).toBeTruthy();
    expect(screen.getByText('Storage')).toBeTruthy();
  });

  it('does not show alert badge when openAlertCount is 0', async () => {
    const { container } = await renderNav('dev-1', 0);
    expect(container.querySelector('.device-tabs__badge')).toBeNull();
  });

  it('shows alert badge with count when openAlertCount > 0', async () => {
    const { container } = await renderNav('dev-1', 3);
    const badge = container.querySelector('.device-tabs__badge');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.trim()).toBe('3');
  });

  it('overview link points to /app/devices/:id', async () => {
    const { container } = await renderNav('dev-1');
    const tabs = container.querySelectorAll('.device-tabs__tab');
    const overviewTab = Array.from(tabs).find(t => t.textContent?.trim() === 'Overview');
    expect(overviewTab?.getAttribute('href')).toContain('dev-1');
  });

  it('alerts link includes /alerts segment', async () => {
    const { container } = await renderNav('dev-1');
    const tabs = container.querySelectorAll('.device-tabs__tab');
    const alertsTab = Array.from(tabs).find(t => t.textContent?.trim().startsWith('Alerts'));
    expect(alertsTab?.getAttribute('href')).toContain('/alerts');
  });
});
