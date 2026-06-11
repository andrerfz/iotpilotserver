import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

export type UserRole = 'READONLY' | 'USER' | 'ADMIN' | 'SUPERADMIN';

type BadgeColor = 'neutral' | 'primary' | 'warning';

const ROLE_COLOR: Record<string, BadgeColor> = {
  READONLY:   'neutral',
  USER:       'neutral',
  ADMIN:      'primary',
  SUPERADMIN: 'warning',
};

@Component({
  selector: 'ui-role-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="badge" [ngClass]="'badge--' + color()">{{ role() }}</span>
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
    .badge--primary { background: var(--primary-weak); color: var(--primary); }
    .badge--warning { background: var(--warning-weak); color: var(--warning); }
    .badge--neutral { background: var(--surface-2);    color: var(--text-muted); border-color: var(--border); }
  `],
})
export class RoleBadgeComponent {
  readonly role = input.required<string>();
  protected readonly color = () => ROLE_COLOR[this.role()] ?? 'neutral';
}
