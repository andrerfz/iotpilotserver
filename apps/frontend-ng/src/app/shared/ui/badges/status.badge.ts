import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR' | 'UNCLAIMED' | 'PENDING_SETUP';
export type CommandStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
export type AlertStatus = 'OPEN' | 'ACK' | 'RESOLVED';
export type AnyStatus = DeviceStatus | CommandStatus | AlertStatus;

type BadgeColor = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'neutral';

interface StatusMeta { color: BadgeColor; label: string; }

const STATUS_META: Record<string, StatusMeta> = {
  // Device
  ONLINE:       { color: 'success', label: 'status.online' },
  OFFLINE:      { color: 'danger',  label: 'status.offline' },
  MAINTENANCE:  { color: 'warning', label: 'status.maintenance' },
  ERROR:        { color: 'danger',  label: 'status.error' },
  UNCLAIMED:    { color: 'neutral', label: 'status.unclaimed' },
  PENDING_SETUP:{ color: 'warning', label: 'status.pending_setup' },
  // Command
  PENDING:      { color: 'warning', label: 'status.pending' },
  RUNNING:      { color: 'info',    label: 'status.running' },
  COMPLETED:    { color: 'success', label: 'status.completed' },
  FAILED:       { color: 'danger',  label: 'status.failed' },
  TIMEOUT:      { color: 'warning', label: 'status.timeout' },
  // Alert
  OPEN:         { color: 'danger',  label: 'status.open' },
  ACK:          { color: 'warning', label: 'status.acknowledged' },
  RESOLVED:     { color: 'success', label: 'status.resolved' },
};

const FALLBACK: StatusMeta = { color: 'neutral', label: '' };

function getMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? { ...FALLBACK, label: status };
}

@Component({
  selector: 'ui-status-badge',
  standalone: true,
  imports: [NgClass, TranslatePipe],
  template: `
    <span class="badge" [ngClass]="'badge--' + color()">{{ label() | translate }}</span>
  `,
  styleUrl: './badge.scss',
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();

  protected readonly color = () => getMeta(this.status()).color;
  protected readonly label = () => getMeta(this.status()).label;
}
