import {
  ChangeDetectionStrategy, Component, TemplateRef, contentChild, input, output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonList, IonItemSliding, IonItem, IonItemOptions, IonItemOption, IonIcon,
} from '@ionic/angular/standalone';

export interface SwipeAction<T> {
  /** Identifier emitted via (action) when this option is tapped. */
  key: string;
  /** i18n label (used when no icon). */
  label: string;
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'medium';
  /** Show this action only when the predicate passes (default: always). */
  show?: (item: T) => boolean;
}

/**
 * Mobile counterpart to `ui-data-table`: renders a list of items as swipeable
 * `ion-item-sliding` rows. Swiping reveals per-row actions; tapping emits
 * `itemClick`. The row content is projected via a `#itemContent` template, so each
 * view shows the fields that matter on a phone. Shares the page's data + handlers
 * with the desktop table (see ViewportService).
 */
@Component({
  selector: 'ui-swipe-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItemSliding, IonItem, IonItemOptions, IonItemOption, IonIcon, NgTemplateOutlet, TranslatePipe],
  template: `
    <ion-list class="swipe-list" lines="none">
      @for (item of items(); track key()(item)) {
        <ion-item-sliding #sliding>
          <ion-item button="true" detail="false" class="swipe-list__item" (click)="itemClick.emit(item)">
            <ng-container *ngTemplateOutlet="content(); context: { $implicit: item }"></ng-container>
          </ion-item>
          <ion-item-options side="end">
            @for (a of visibleActions(item); track a.key) {
              <ion-item-option [color]="a.color || 'medium'" (click)="onAction(a.key, item, sliding)">
                @if (a.icon) {
                  <ion-icon slot="icon-only" [name]="a.icon"></ion-icon>
                } @else {
                  {{ a.label | translate }}
                }
              </ion-item-option>
            }
          </ion-item-options>
        </ion-item-sliding>
      }
    </ion-list>
  `,
  styleUrl: './swipe-list.component.scss',
})
export class SwipeListComponent<T> {
  readonly items = input<T[]>([]);
  readonly actions = input<SwipeAction<T>[]>([]);
  /** Row identity for tracking; defaults to the item's `id` field. */
  readonly key = input<(item: T) => unknown>((item: T) => (item as { id?: unknown })?.id ?? item);

  readonly itemClick = output<T>();
  readonly action = output<{ key: string; item: T }>();

  /** Row content template: `<ng-template #itemContent let-item>…</ng-template>`. */
  protected readonly content = contentChild.required<TemplateRef<{ $implicit: T }>>('itemContent');

  protected visibleActions(item: T): SwipeAction<T>[] {
    return this.actions().filter((a) => !a.show || a.show(item));
  }

  /** Close the open sliding row before emitting, so it doesn't leave a gap. */
  protected onAction(key: string, item: T, sliding: IonItemSliding): void {
    void sliding.close();
    this.action.emit({ key, item });
  }
}
