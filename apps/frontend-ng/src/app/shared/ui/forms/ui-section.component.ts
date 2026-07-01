import {
  Component,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * ui-section — titled settings/form section card.
 *
 * Slots:
 *   [aside]   → optional right-aligned section action (e.g. "Reset")
 *   (default) → section body (ui-setting-row, fields…)
 */
@Component({
  selector: 'ui-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <header class="sec__head">
      <div>
        <h2 class="sec__title">{{ title() | translate }}</h2>
        @if (description()) {
          <p class="sec__desc">{{ description() | translate }}</p>
        }
      </div>
      <div class="sec__aside"><ng-content select="[aside]"></ng-content></div>
    </header>
    <div class="sec__body">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: var(--surface);
      border: 1px solid var(--ui-border);
      border-radius: var(--r-lg);
      overflow: hidden;
    }
    .sec__head {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--ui-border);
    }
    .sec__title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text); }
    .sec__desc { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); text-wrap: pretty; }
    .sec__aside { margin-left: auto; flex: none; }
    .sec__aside:empty { display: none; }
    .sec__body { padding: 6px 18px; }
  `],
})
export class UiSectionComponent {
  readonly title       = input.required<string>();
  readonly description = input<string>('');
}
