import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Renders N shimmer blocks (lines) using the global `.sk` class.
 * Use inside any component's loading branch:
 *
 *   @if (isLoading()) {
 *     <ui-skeleton [lines]="3" [widths]="['60%','100%','80%']"></ui-skeleton>
 *   }
 *
 * For a single block, set `lines="1"` (default) and control size via `width`/`height`.
 * Pass `widths` to give each line a different width (cycles if fewer than `lines`).
 */
@Component({
  selector: 'ui-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (i of _rows(); track i) {
      <span class="sk sk-line"
        [style.width]="_lineWidth(i)"
        [style.height]="height()">
      </span>
    }
  `,
  styles: [`:host { display: flex; flex-direction: column; gap: 8px; } .sk-line { flex: none; }`],
})
export class UiSkeletonComponent {
  readonly lines  = input(1);
  readonly width  = input('100%');
  readonly height = input('14px');
  /** Per-line widths. Cycles when fewer entries than `lines`. */
  readonly widths = input<string[]>([]);

  protected readonly _rows = computed(() => Array.from({ length: this.lines() }, (_, i) => i));

  protected _lineWidth(i: number): string {
    const ws = this.widths();
    return ws.length ? (ws[i % ws.length] ?? this.width()) : this.width();
  }
}
