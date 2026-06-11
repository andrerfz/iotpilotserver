import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-device-type-badge',
  standalone: true,
  template: `
    <span class="type-badge">{{ display() }}</span>
  `,
  styles: [`
    :host { display: contents; }
    .type-badge {
      display: inline-flex; align-items: center;
      height: 22px; padding: 0 9px; border-radius: 99px;
      font-size: 11.5px; font-weight: 550; white-space: nowrap;
      font-family: var(--font-mono); letter-spacing: 0.02em;
      background: var(--primary-weak); color: var(--primary);
      border: 1px solid transparent;
    }
  `],
})
export class DeviceTypeBadgeComponent {
  readonly type = input.required<string>();
  protected readonly display = () => this.type().replace(/_/g, ' ');
}
