import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

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
  critical: 'severity.critical', CRITICAL: 'severity.critical',
  warning:  'severity.warning',  WARNING:  'severity.warning',
  ERROR:    'severity.error',    info:     'severity.info',    INFO: 'severity.info',
};

@Component({
  selector: 'ui-severity-badge',
  standalone: true,
  imports: [NgClass, TranslatePipe],
  template: `
    <span class="badge" [ngClass]="'badge--' + color()">{{ label() | translate }}</span>
  `,
  styleUrl: './badge.scss',
})
export class SeverityBadgeComponent {
  readonly severity = input.required<string>();

  protected readonly color = () => COLOR_MAP[this.severity()] ?? 'info';
  protected readonly label = () => LABEL_MAP[this.severity()] ?? this.severity();
}
