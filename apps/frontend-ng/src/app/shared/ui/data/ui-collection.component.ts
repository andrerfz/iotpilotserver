import {
  Component,
  input,
  output,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DataTableComponent, ColumnDef } from './data-table.component';
import { SwipeListComponent } from './swipe-list.component';
import { UiListRowComponent } from './list-row.component';
import type { ListRowCol } from './list-row.component';
import type { SwipeAction } from './swipe-list.component';
import { ViewportService } from '@ng/core/layout/viewport.service';

/**
 * ui-collection — ONE responsive list declaration, two presentations.
 *
 * Desktop (≥1080px): renders ui-data-table.
 * Mobile (<1080px):  renders ui-swipe-list with ui-list-row rows derived
 *                    from the column definitions.
 *
 * @example
 *   <ui-collection
 *     [columns]="cols"
 *     [rows]="devices()"
 *     mobilePrimary="hostname"
 *     mobileSecondary="deviceType"
 *     [mobileActions]="swipeActions"
 *     (rowClick)="open($event)">
 *   </ui-collection>
 */
@Component({
  selector: 'ui-collection',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, SwipeListComponent, UiListRowComponent],
  template: `
    @if (viewport.wide()) {
      <ui-data-table
        [columns]="columns()"
        [rows]="rows()"
        [rowKey]="rowKey()"
        [rowClickable]="rowClickable()"
        [selectable]="selectable()"
        [pageSize]="pageSize()"
        (rowClick)="rowClick.emit($event)"
        (selectionChange)="selectionChange.emit($event)">
        <ng-content select="[bulkActions]"></ng-content>
      </ui-data-table>
    } @else {
      <ui-swipe-list
        [items]="rows()"
        [actions]="mobileActions()"
        (itemClick)="rowClick.emit($any($event))"
        (action)="action.emit($any($event))">
        <ng-template #itemContent let-row>
          <ui-list-row
            [title]="cellValue(row, mobilePrimary())"
            [subtitle]="cellValue(row, mobileSecondary())"
            [cols]="rowCols(row)">
          </ui-list-row>
        </ng-template>
      </ui-swipe-list>
    }
  `,
})
export class UiCollectionComponent<T extends object = Record<string, unknown>> {
  protected readonly viewport = inject(ViewportService);

  readonly columns      = input.required<ColumnDef<T>[]>();
  readonly rows         = input<T[]>([]);
  readonly rowKey       = input<string>('id');
  readonly rowClickable = input(false);
  readonly selectable   = input(false);
  readonly pageSize     = input(6);

  /** Column key used as bold title on mobile rows. */
  readonly mobilePrimary   = input<string>('');
  /** Column key used as muted subtitle on mobile rows. */
  readonly mobileSecondary = input<string>('');
  /** Swipe actions for mobile rows. */
  readonly mobileActions   = input<SwipeAction<T>[]>([]);

  readonly rowClick        = output<T>();
  readonly selectionChange = output<T[]>();
  readonly action          = output<{ key: string; item: T }>();

  protected cellValue(row: T, key: string): string {
    if (!key) return '';
    return String((row as Record<string, unknown>)[key] ?? '');
  }

  protected rowCols(row: T): ListRowCol[] {
    const primary   = this.mobilePrimary();
    const secondary = this.mobileSecondary();
    return this.columns()
      .filter(c => c.key !== primary && c.key !== secondary)
      .map(c => ({ label: c.label, value: this.cellValue(row, c.key) }));
  }
}
