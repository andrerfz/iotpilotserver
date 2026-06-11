import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { StatusBadgeComponent } from './status.badge';
import { StatusDotComponent } from './status-dot.component';
import { SeverityBadgeComponent } from './severity.badge';
import { RoleBadgeComponent } from './role.badge';
import { DeviceTypeBadgeComponent } from './device-type.badge';

// ─── StatusBadge ─────────────────────────────────────────────────────────────

describe('StatusBadgeComponent', () => {
  const deviceStatuses = ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR', 'UNCLAIMED', 'PENDING_SETUP'];
  const commandStatuses = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT'];
  const alertStatuses = ['OPEN', 'ACK', 'RESOLVED'];

  for (const status of [...deviceStatuses, ...commandStatuses, ...alertStatuses]) {
    it(`renders ${status} without error`, async () => {
      const { getByText } = await render(StatusBadgeComponent, {
        inputs: { status },
      });
      const el = getByText(/./); // any text — just checks it renders
      expect(el).toBeTruthy();
    });
  }

  it('applies success color for ONLINE', async () => {
    const { container } = await render(StatusBadgeComponent, {
      inputs: { status: 'ONLINE' },
    });
    expect(container.querySelector('.badge--success')).toBeTruthy();
  });

  it('applies danger color for ERROR', async () => {
    const { container } = await render(StatusBadgeComponent, {
      inputs: { status: 'ERROR' },
    });
    expect(container.querySelector('.badge--danger')).toBeTruthy();
  });

  it('applies warning color for MAINTENANCE', async () => {
    const { container } = await render(StatusBadgeComponent, {
      inputs: { status: 'MAINTENANCE' },
    });
    expect(container.querySelector('.badge--warning')).toBeTruthy();
  });

  it('falls back gracefully for unknown status', async () => {
    const { container } = await render(StatusBadgeComponent, {
      inputs: { status: 'UNKNOWN_FUTURE_STATUS' },
    });
    const badge = container.querySelector('.badge--neutral');
    expect(badge).toBeTruthy();
  });
});

// ─── StatusDot ───────────────────────────────────────────────────────────────

describe('StatusDotComponent', () => {
  it('renders ONLINE dot with live class when live=true', async () => {
    const { container } = await render(StatusDotComponent, {
      inputs: { status: 'ONLINE', live: true },
    });
    const dot = container.querySelector('.dot');
    expect(dot?.classList.contains('dot--online')).toBe(true);
    expect(dot?.classList.contains('dot--live')).toBe(true);
  });

  it('renders ONLINE dot without live class when live=false', async () => {
    const { container } = await render(StatusDotComponent, {
      inputs: { status: 'ONLINE', live: false },
    });
    const dot = container.querySelector('.dot');
    expect(dot?.classList.contains('dot--live')).toBe(false);
  });

  it('renders OFFLINE dot (no live)', async () => {
    const { container } = await render(StatusDotComponent, {
      inputs: { status: 'OFFLINE' },
    });
    expect(container.querySelector('.dot--offline')).toBeTruthy();
    expect(container.querySelector('.dot--live')).toBeFalsy();
  });
});

// ─── SeverityBadge ───────────────────────────────────────────────────────────

describe('SeverityBadgeComponent', () => {
  const prototypeCases: [string, string][] = [
    ['critical', 'badge--danger'],
    ['warning',  'badge--warning'],
    ['info',     'badge--info'],
  ];
  const legacyCases: [string, string][] = [
    ['CRITICAL', 'badge--danger'],
    ['WARNING',  'badge--warning'],
    ['ERROR',    'badge--danger'],
    ['INFO',     'badge--info'],
  ];

  for (const [severity, expectedClass] of [...prototypeCases, ...legacyCases]) {
    it(`${severity} renders with ${expectedClass}`, async () => {
      const { container } = await render(SeverityBadgeComponent, {
        inputs: { severity },
      });
      expect(container.querySelector('.' + expectedClass)).toBeTruthy();
    });
  }
});

// ─── RoleBadge ───────────────────────────────────────────────────────────────

describe('RoleBadgeComponent', () => {
  it('READONLY renders neutral', async () => {
    const { container } = await render(RoleBadgeComponent, { inputs: { role: 'READONLY' } });
    expect(container.querySelector('.badge--neutral')).toBeTruthy();
  });
  it('ADMIN renders primary', async () => {
    const { container } = await render(RoleBadgeComponent, { inputs: { role: 'ADMIN' } });
    expect(container.querySelector('.badge--primary')).toBeTruthy();
  });
  it('SUPERADMIN renders warning', async () => {
    const { container } = await render(RoleBadgeComponent, { inputs: { role: 'SUPERADMIN' } });
    expect(container.querySelector('.badge--warning')).toBeTruthy();
  });
});

// ─── DeviceTypeBadge ─────────────────────────────────────────────────────────

describe('DeviceTypeBadgeComponent', () => {
  it('renders type with underscores replaced by spaces', async () => {
    const { getByText } = await render(DeviceTypeBadgeComponent, {
      inputs: { type: 'RASPBERRY_PI' },
    });
    expect(getByText('RASPBERRY PI')).toBeTruthy();
  });

  it('renders simple type unchanged', async () => {
    const { getByText } = await render(DeviceTypeBadgeComponent, {
      inputs: { type: 'NUC' },
    });
    expect(getByText('NUC')).toBeTruthy();
  });
});
