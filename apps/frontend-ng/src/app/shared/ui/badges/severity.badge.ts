import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

/** Accepts prototype lowercase values (critical/warning/info) or legacy uppercase (CRITICAL/WARNING/ERROR/INFO). */
export type Severity = 'critical' | 'warning' | 'info' | 'CRITICAL' | 'WARNING' | 'ERROR' | 'INFO';

type BadgeColor = 'danger' | 'warning' | 'info';

const COLOR_MAP: Record<string, BadgeColor> = {
  critical: 'danger',
  CRITICAL: 'danger',
  warning:  'warning',
  WARNING:  'warning',
  ERROR:    'danger',
  info:     'info',
  INFO:     'info',
};

const LABEL_MAP: Record<string, string> = {
  critical: 'Critical', CRITICAL: 'Critical',
  warning:  'Warning',  WARNING:  'Warning',
  ERROR:    'Error',    info:     'Info',    INFO: 'Info',
};

@Component({
  selector: 'ui-severity-badge',
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
    .badge--danger  { background: var(--danger-weak);  color: var(--danger); }
    .badge--warning { background: var(--warning-weak); color: var(--warning); }
    .badge--info    { background: var(--info-weak);    color: var(--info); }
  `],
})
export class SeverityBadgeComponent {
  readonly severity = input.required<string>();

  protected readonly color = () => COLOR_MAP[this.severity()] ?? 'info';
  protected readonly label = () => LABEL_MAP[this.severity()] ?? this.severity();
}
