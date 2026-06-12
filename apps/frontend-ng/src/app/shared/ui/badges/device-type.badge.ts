import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-device-type-badge',
  standalone: true,
  template: `
    <span class="badge badge--primary">{{ display() }}</span>
  `,
  styleUrl: './badge.scss',
})
export class DeviceTypeBadgeComponent {
  readonly type = input.required<string>();
  protected readonly display = () => this.type().replace(/_/g, ' ');
}
