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
  styleUrl: './badge.scss',
})
export class RoleBadgeComponent {
  readonly role = input.required<string>();
  protected readonly color = () => ROLE_COLOR[this.role()] ?? 'neutral';
}
