import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { EmptyStateComponent } from './empty-state.component';

export interface ColumnDef<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  /** Template reference for custom cell rendering. Receives the row as $implicit context. */
  cellTemplate?: TemplateRef<{ $implicit: T }>;
}

interface SortState { key: string; dir: 1 | -1; }

@Component({
  selector: 'ui-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, EmptyStateComponent],
  template: `
    <!-- Bulk-action bar -->
    @if (selectable() && selected().length) {
      <div class="selbar">
        <span class="selbar__count">{{ selected().length }}</span>
        <span class="selbar__muted">selected</span>
        <div style="flex:1"></div>
        <ng-content select="[bulkActions]"></ng-content>
        <button class="selbar__clear btn-ghost" (click)="clearSelection()">Clear</button>
      </div>
    }

    <!-- Table -->
    <div class="tablewrap">
      <div style="overflow-x: auto;">
        <table class="table">
          <thead>
            <tr>
              @if (selectable()) {
                <th class="checkcell">
                  <span class="checkbox" [class.checkbox--on]="allOnPageSelected()"
                    (click)="toggleAll()"
                    (keydown.enter)="toggleAll()"
                    (keydown.space)="toggleAll()"
                    tabindex="0" role="checkbox"
                    [attr.aria-checked]="allOnPageSelected()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                      width="12" height="12">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                </th>
              }
              @for (col of columns(); track col.key) {
                <th
                  [class.sortable]="col.sortable"
                  [style.width]="col.width ?? null"
                  (click)="col.sortable ? doSort(col.key) : null"
                  (keydown.enter)="col.sortable ? doSort(col.key) : null"
                  [attr.tabindex]="col.sortable ? 0 : null">
                  <span class="th-sort">
                    {{ col.label }}
                    @if (col.sortable && sort().key === col.key) {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        width="12" height="12">
                        @if (sort().dir === 1) {
                          <polyline points="18 15 12 9 6 15"></polyline>
                        }
                        @if (sort().dir === -1) {
                          <polyline points="6 9 12 15 18 9"></polyline>
                        }
                      </svg>
                    }
                  </span>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of pageView(); track row[rowKey()]) {
              <tr
                [class.row--clickable]="rowClickable()"
                (click)="rowClickable() ? rowClick.emit(row) : null">
                @if (selectable()) {
                  <td class="checkcell">
                    <span class="checkbox" [class.checkbox--on]="isSelected(row)"
                      (click)="$event.stopPropagation(); toggle(row)"
                      (keydown.enter)="$event.stopPropagation(); toggle(row)"
                      (keydown.space)="$event.stopPropagation(); toggle(row)"
                      tabindex="0" role="checkbox" [attr.aria-checked]="isSelected(row)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                        width="12" height="12">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                  </td>
                }
                @for (col of columns(); track col.key) {
                  <td>
                    @if (col.cellTemplate) {
                      <ng-container *ngTemplateOutlet="col.cellTemplate; context: { $implicit: row }"></ng-container>
                    } @else {
                      {{ getValue(row, col.key) }}
                    }
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="columns().length + (selectable() ? 1 : 0)">
                  <ui-empty-state title="No data"></ui-empty-state>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Footer: count + pager -->
      <div class="table__foot">
        <span>
          {{ sorted().length }} rows
          @if (selectable() && selected().length) {
            &middot; {{ selected().length }} selected
          }
        </span>
        @if (pageCount() > 1) {
          <div class="pager">
            <button [disabled]="page() === 0" (click)="setPage(page() - 1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                width="14" height="14"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            @for (p of pageRange(); track p) {
              <button
                [class.is-active]="p === page()"
                (click)="setPage(p)">{{ p + 1 }}</button>
            }
            <button [disabled]="page() >= pageCount() - 1" (click)="setPage(page() + 1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                width="14" height="14"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .selbar {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 14px; background: var(--primary-weak);
      border-radius: var(--r-sm) var(--r-sm) 0 0; border: 1px solid var(--primary-line);
      border-bottom: none;
    }
    .selbar__count { font-weight: 600; color: var(--primary); }
    .selbar__muted { color: var(--text-muted); }
    .selbar__clear { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 13px; padding: 4px 8px; }
    .tablewrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); font-size: 13px; }
    .table th { font-size: var(--fs-label); letter-spacing: var(--ls-label); text-transform: uppercase; font-family: var(--font-mono); color: var(--text-dim); background: var(--surface-2); font-weight: 550; }
    .table th.sortable { cursor: pointer; }
    .table th.sortable:hover { color: var(--text); }
    .table tbody tr:last-child td { border-bottom: none; }
    .row--clickable { cursor: pointer; }
    .row--clickable:hover { background: var(--surface-2); }
    .th-sort { display: flex; align-items: center; gap: 4px; }
    .checkcell { width: 44px; }
    .checkbox {
      width: 16px; height: 16px; border-radius: 3px;
      border: 1.5px solid var(--border-strong); background: var(--surface-2);
      display: inline-flex; align-items: center; justify-content: center;
      flex: none; cursor: pointer; color: transparent;
      transition: background 0.1s, border-color 0.1s;
    }
    .checkbox:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .checkbox--on { background: var(--primary); border-color: var(--primary); color: var(--primary-ink); }
    .table__foot { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; font-size: 12px; color: var(--text-muted); background: var(--surface-2); border-top: 1px solid var(--border); }
    .pager { display: flex; align-items: center; gap: 4px; }
    .pager button { background: var(--surface-3); border: 1px solid var(--border); border-radius: 4px; width: 26px; height: 26px; display: grid; place-items: center; cursor: pointer; color: var(--text-muted); padding: 0; }
    .pager button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pager button.is-active { background: var(--primary); border-color: var(--primary); color: var(--primary-ink); }
  `],
})
export class DataTableComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly columns = input.required<ColumnDef<T>[]>();
  readonly rows = input<T[]>([]);
  readonly rowKey = input<string>('id');
  readonly selectable = input(false);
  readonly rowClickable = input(false);
  readonly pageSize = input(6);

  readonly rowClick = output<T>();
  readonly selectionChange = output<T[]>();

  protected readonly page = signal(0);
  protected readonly sort = signal<SortState>({ key: '', dir: 1 });
  protected readonly selected = signal<unknown[]>([]);

  protected readonly sorted = computed(() => {
    const s = this.sort();
    if (!s.key) return this.rows();
    const col = this.columns().find(c => c.key === s.key);
    if (!col) return this.rows();
    return [...this.rows()].sort((a, b) => {
      const av = a[s.key] as string | number, bv = b[s.key] as string | number;
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * s.dir;
    });
  });

  protected readonly pageCount = computed(() => Math.ceil(this.sorted().length / this.pageSize()) || 1);

  protected readonly pageView = computed(() => {
    const p = this.page();
    return this.sorted().slice(p * this.pageSize(), p * this.pageSize() + this.pageSize());
  });

  protected readonly pageRange = computed(() =>
    Array.from({ length: this.pageCount() }, (_, i) => i),
  );

  protected readonly allOnPageSelected = computed(() => {
    const view = this.pageView();
    return view.length > 0 && view.every(r => this.selected().includes(r[this.rowKey()]));
  });

  protected getValue(row: T, key: string): unknown {
    return row[key];
  }

  protected isSelected(row: T): boolean {
    return this.selected().includes(row[this.rowKey()]);
  }

  protected toggleAll(): void {
    const view = this.pageView();
    const keys = view.map(r => r[this.rowKey()]);
    if (this.allOnPageSelected()) {
      this.selected.update(s => s.filter(k => !keys.includes(k)));
    } else {
      this.selected.update(s => [...new Set([...s, ...keys])]);
    }
    this.selectionChange.emit(this.rows().filter(r => this.selected().includes(r[this.rowKey()])));
  }

  protected toggle(row: T): void {
    const key = row[this.rowKey()];
    this.selected.update(s =>
      s.includes(key) ? s.filter(k => k !== key) : [...s, key],
    );
    this.selectionChange.emit(this.rows().filter(r => this.selected().includes(r[this.rowKey()])));
  }

  protected clearSelection(): void {
    this.selected.set([]);
    this.selectionChange.emit([]);
  }

  protected doSort(key: string): void {
    this.sort.update(s => s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 });
    this.page.set(0);
  }

  protected setPage(p: number): void {
    const max = this.pageCount() - 1;
    this.page.set(Math.max(0, Math.min(p, max)));
  }
}
