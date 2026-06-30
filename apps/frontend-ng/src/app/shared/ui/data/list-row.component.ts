import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface ListRowCol {
  label: string;
  value: string;
}

/**
 * Responsive row content for use inside ui-swipe-list's #itemContent template.
 *
 * Desktop (≥1080px): [lead] [title + subtitle] → [cols on the right]
 * Mobile (<1080px):  [lead] [title + subtitle + meta pairs below]
 *
 * The lead slot accepts any element with the `lead` attribute:
 *   <ui-status-dot lead [status]="d.status"></ui-status-dot>
 *
 * `meta` is a flat array of alternating key/value strings shown only on mobile.
 * `cols` are structured columns shown only on desktop.
 */
@Component({
  selector: 'ui-list-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'list-row.component.html',
  styleUrl: 'list-row.component.scss',
})
export class UiListRowComponent {
  readonly title    = input.required<string>();
  readonly subtitle = input<string>('');
  readonly meta     = input<string[]>([]);
  readonly cols     = input<ListRowCol[]>([]);

  protected readonly metaPairs = computed(() => {
    const flat = this.meta();
    const pairs: { label: string; value: string }[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      pairs.push({ label: flat[i], value: flat[i + 1] });
    }
    return pairs;
  });
}
