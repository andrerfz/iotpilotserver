import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'ui-status-dot',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="dot"
      [ngClass]="[
        'dot--' + status().toLowerCase(),
        status() === 'ONLINE' && live() ? 'dot--live' : ''
      ]"
      [attr.aria-label]="status()">
    </span>
  `,
  styleUrl: './status-dot.component.css',
})
export class StatusDotComponent {
  readonly status = input.required<string>();
  /** When true, ONLINE status gets the live pulse animation. */
  readonly live = input(false);
}
