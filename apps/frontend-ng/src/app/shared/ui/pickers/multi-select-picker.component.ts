import { Component, inject, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { search, checkmark } from 'ionicons/icons';
import { FilterChipComponent } from '../sheets/filter-chip.component';
import { BottomSheetComponent } from '../sheets/bottom-sheet.component';
import { StatusDotComponent } from '../badges/status-dot.component';
import { SeverityBadgeComponent } from '../badges/severity.badge';
import { EmptyStateComponent } from '../data/empty-state.component';

addIcons({ search, checkmark });

export interface PickerOption<T = string> {
  value: T;
  label: string;
  /** Optional StatusDot status (device-style rows). */
  dot?: string;
  /** Optional SeverityBadge value (renders a badge instead of a plain label). */
  severity?: string;
  /** Optional secondary line (e.g. "id · location" or email). */
  meta?: string;
}

/**
 * Generic multi/single-select picker — the prototype `MultiSelectPicker`, built
 * on FilterChip + BottomSheet. Holds a draft synced from `value` on open; commits
 * via `valueChange` on Save. DevicePicker/UserPicker are thin specializations
 * that map domain items onto PickerOption[].
 */
@Component({
  selector: 'ui-multi-select-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonIcon, FilterChipComponent, BottomSheetComponent,
    StatusDotComponent, SeverityBadgeComponent, EmptyStateComponent, TranslatePipe,
  ],
  template: `
    <ui-filter-chip
      [label]="label()"
      [value]="summary()"
      [active]="value().length > 0"
      [count]="multi() ? value().length : 0"
      (chipClick)="sheet.open()"
      (clear)="valueChange.emit([])">
      @if (chipIcon()) {
        <ion-icon icon [name]="chipIcon()"></ion-icon>
      }
    </ui-filter-chip>

    <ui-bottom-sheet
      #sheet
      [title]="title()"
      [sub]="sub()"
      [count]="multi() ? draft().length : null"
      [saveLabel]="'ui.apply' | translate"
      (willOpen)="onWillOpen()"
      (save)="save()">
      @if (searchable()) {
        <div class="field">
          <ion-icon name="search"></ion-icon>
          <input [placeholder]="searchPlaceholder() || ('ui.search_placeholder' | translate)" [value]="query()"
            (input)="query.set($any($event.target).value)" />
        </div>
      }
      <div class="optlist">
        @for (opt of filtered(); track opt.value) {
          <div class="opt" [class.opt--sel]="isSelected(opt.value)"
            role="button" tabindex="0"
            (click)="toggle(opt.value)"
            (keydown.enter)="toggle(opt.value)"
            (keydown.space)="toggle(opt.value)">
            @if (opt.dot) { <ui-status-dot [status]="opt.dot"></ui-status-dot> }
            @if (opt.severity) { <ui-severity-badge [severity]="opt.severity"></ui-severity-badge> }
            <div class="opt__main">
              @if (!opt.severity) { <div class="opt__title">{{ opt.label | translate }}</div> }
              @if (opt.meta) { <div class="opt__meta">{{ opt.meta }}</div> }
            </div>
            <div class="opt__check">
              <ion-icon name="checkmark"></ion-icon>
            </div>
          </div>
        } @empty {
          <ui-empty-state [title]="'ui.no_matches' | translate"></ui-empty-state>
        }
      </div>
    </ui-bottom-sheet>
  `,
  styleUrl: './multi-select-picker.component.scss',
})
export class MultiSelectPickerComponent<T = string> {
  readonly label = input.required<string>();
  readonly title = input('');
  readonly sub = input('');
  /** ion-icon name for the chip's leading icon (register it where you set it). */
  readonly chipIcon = input('');
  readonly options = input<PickerOption<T>[]>([]);
  readonly value = input<T[]>([]);
  readonly multi = input(true);
  readonly searchable = input(false);
  readonly searchPlaceholder = input('');

  readonly valueChange = output<T[]>();

  private readonly t = inject(TranslateService);

  protected readonly draft = signal<T[]>([]);
  protected readonly query = signal('');

  protected readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.options();
    return this.options().filter(o => `${o.label} ${o.meta ?? ''}`.toLowerCase().includes(q));
  });

  protected readonly summary = computed(() => {
    const v = this.value();
    if (!v.length) return '';
    if (v.length === 1) {
      const label = this.options().find(o => o.value === v[0])?.label ?? '';
      return label ? this.t.instant(label) : '';
    }
    return `${v.length} ${this.t.instant('common.selected')}`;
  });

  protected onWillOpen(): void {
    this.draft.set([...this.value()]);
    this.query.set('');
  }

  protected isSelected(v: T): boolean {
    return this.draft().includes(v);
  }

  protected toggle(v: T): void {
    if (this.multi()) {
      this.draft.update(d => d.includes(v) ? d.filter(x => x !== v) : [...d, v]);
    } else {
      this.draft.set([v]);
    }
  }

  protected save(): void {
    this.valueChange.emit(this.draft());
  }
}
