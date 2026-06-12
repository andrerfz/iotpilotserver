import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'ui-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      @if (hasIcon()) {
        <div class="empty__icon">
          <ng-content select="[icon]"></ng-content>
        </div>
      }
      <p class="empty__title">{{ title() }}</p>
      @if (description()) {
        <p class="empty__desc">{{ description() }}</p>
      }
      @if (hasAction()) {
        <div class="empty__action">
          <ng-content select="[action]"></ng-content>
        </div>
      }
    </div>
  `,
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  /** Whether the [icon] slot has content — passed as input to avoid slot detection. */
  readonly hasIcon = input(false);
  /** Whether the [action] slot has content. */
  readonly hasAction = input(false);
}
