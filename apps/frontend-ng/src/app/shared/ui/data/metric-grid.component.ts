import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * Standard responsive container for a row of KPI widgets (`ui-metric-card`).
 *
 * One pattern for every view: cards grow to fill the available width up to
 * their natural max, then wrap to the next row instead of overflowing off
 * screen. Replaces the per-page `repeat(N, 1fr)` grids that each defined their
 * own (often missing) breakpoints.
 *
 * `min` sets the smallest a card may shrink before a column wraps (drives the
 * `minmax()` floor); `gap` sets the inter-card spacing. Both are CSS lengths.
 */
@Component({
  selector: 'ui-metric-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  styleUrl: './metric-grid.component.scss',
  host: {
    '[style.--ui-metric-min]': 'min()',
    '[style.--ui-metric-gap]': 'gap()',
  },
})
export class MetricGridComponent {
  readonly min = input('150px');
  readonly gap = input('12px');
}
