import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR' | 'UNCLAIMED' | 'PENDING_SETUP';
export type CommandStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
export type AlertStatus = 'OPEN' | 'ACK' | 'RESOLVED';
export type AnyStatus = DeviceStatus | CommandStatus | AlertStatus;

type BadgeColor = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'neutral';

interface StatusMeta { color: BadgeColor; label: string; }

const STATUS_META: Record<string, StatusMeta> = {
  // Device
  ONLINE:       { color: 'success', label: 'Online' },
  OFFLINE:      { color: 'danger',  label: 'Offline' },
  MAINTENANCE:  { color: 'warning', label: 'Maintenance' },
  ERROR:        { color: 'danger',  label: 'Error' },
  UNCLAIMED:    { color: 'neutral', label: 'Unclaimed' },
  PENDING_SETUP:{ color: 'warning', label: 'Pending setup' },
  // Command
  PENDING:      { color: 'warning', label: 'Pending' },
  RUNNING:      { color: 'info',    label: 'Running' },
  COMPLETED:    { color: 'success', label: 'Completed' },
  FAILED:       { color: 'danger',  label: 'Failed' },
  TIMEOUT:      { color: 'warning', label: 'Timeout' },
  // Alert
  OPEN:         { color: 'danger',  label: 'Open' },
  ACK:          { color: 'warning', label: 'Acknowledged' },
  RESOLVED:     { color: 'success', label: 'Resolved' },
};

const FALLBACK: StatusMeta = { color: 'neutral', label: '' };

function getMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? { ...FALLBACK, label: status };
}

@Component({
  selector: 'ui-status-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="badge" [ngClass]="'badge--' + color()">{{ label() }}</span>
  `,
  styles: [`
    :host { display: contents; }
    .badge {
      display: inline-flex; align-items: center;
      height: 22px; padding: 0 9px; border-radius: 99px;
      font-size: 11.5px; font-weight: 550; white-space: nowrap;
      font-family: var(--font-mono); letter-spacing: 0.02em;
      border: 1px solid transparent;
    }
    .badge--success { background: var(--success-weak); color: var(--success); }
    .badge--danger  { background: var(--danger-weak);  color: var(--danger); }
    .badge--warning { background: var(--warning-weak); color: var(--warning); }
    .badge--info    { background: var(--info-weak);    color: var(--info); }
    .badge--primary { background: var(--primary-weak); color: var(--primary); }
    .badge--neutral { background: var(--surface-2);    color: var(--text-muted); border-color: var(--border); }
  `],
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();

  protected readonly color = () => getMeta(this.status()).color;
  protected readonly label = () => getMeta(this.status()).label;
}
