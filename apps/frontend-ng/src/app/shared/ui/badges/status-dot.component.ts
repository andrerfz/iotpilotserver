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
  styles: [`
    :host { display: contents; }
    .dot {
      width: 8px; height: 8px; border-radius: 99px;
      flex: none; display: inline-block;
    }
    .dot--online        { background: var(--success); box-shadow: 0 0 0 3px var(--success-weak); }
    .dot--offline       { background: var(--danger);  box-shadow: 0 0 0 3px var(--danger-weak); }
    .dot--error         { background: var(--danger);  box-shadow: 0 0 0 3px var(--danger-weak); }
    .dot--maintenance,
    .dot--pending_setup,
    .dot--pending       { background: var(--warning); box-shadow: 0 0 0 3px var(--warning-weak); }
    .dot--unclaimed     { background: var(--text-dim); box-shadow: 0 0 0 3px var(--surface-3); }
    .dot--running       { background: var(--info); box-shadow: 0 0 0 3px var(--info-weak); }
    .dot--completed     { background: var(--success); }
    .dot--resolved      { background: var(--success); }
    .dot--open          { background: var(--danger); }
    .dot--ack           { background: var(--warning); }
    .dot--live {
      animation: dot-pulse 2s ease-in-out infinite;
    }
    @keyframes dot-pulse {
      0%, 100% { box-shadow: 0 0 0 3px var(--success-weak); }
      50%       { box-shadow: 0 0 0 5px transparent; }
    }
  `],
})
export class StatusDotComponent {
  readonly status = input.required<string>();
  /** When true, ONLINE status gets the live pulse animation. */
  readonly live = input(false);
}
