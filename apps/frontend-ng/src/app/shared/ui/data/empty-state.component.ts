import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'ui-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf],
  template: `
    <div class="empty">
      <div *ngIf="hasIcon()" class="empty__icon">
        <ng-content select="[icon]"></ng-content>
      </div>
      <p class="empty__title">{{ title() }}</p>
      <p *ngIf="description()" class="empty__desc">{{ description() }}</p>
      <div *ngIf="hasAction()" class="empty__action">
        <ng-content select="[action]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .empty {
      display: flex; flex-direction: column; align-items: center;
      padding: 40px 20px; text-align: center; gap: 8px;
    }
    .empty__icon { margin-bottom: 8px; color: var(--text-dim); }
    .empty__icon ::ng-deep svg,
    .empty__icon ::ng-deep ion-icon { width: 32px; height: 32px; }
    .empty__title { font-size: 14px; color: var(--text-muted); margin: 0; }
    .empty__desc { font-size: 12px; color: var(--text-dim); margin: 0; }
    .empty__action { margin-top: 8px; }
  `],
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  /** Whether the [icon] slot has content — passed as input to avoid slot detection. */
  readonly hasIcon = input(false);
  /** Whether the [action] slot has content. */
  readonly hasAction = input(false);
}
