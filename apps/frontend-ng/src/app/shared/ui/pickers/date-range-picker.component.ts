import { Component, inject, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { calendarOutline, chevronBack, chevronForward } from 'ionicons/icons';
import { FilterChipComponent } from '../sheets/filter-chip.component';
import { BottomSheetComponent } from '../sheets/bottom-sheet.component';

addIcons({ calendarOutline, chevronBack, chevronForward });

export interface DateRangePreset {
  id: string;
  label: string;
  hint: string;
}

const DEFAULT_PRESETS: DateRangePreset[] = [
  { id: '1h', label: 'ui.date_range.last_hour', hint: 'now − 60m' },
  { id: '24h', label: 'ui.date_range.last_24h', hint: 'now − 24h' },
  { id: '7d', label: 'ui.date_range.last_7d', hint: 'now − 7d' },
  { id: '30d', label: 'ui.date_range.last_30d', hint: 'now − 30d' },
];

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Date range picker — prototype presets (24h/7d/…) plus a read-only mini
 * calendar of the current month. Preset is the functional selection; the
 * calendar is a visual aid (interactive custom ranges are fe-dashboard scope).
 */
@Component({
  selector: 'ui-date-range-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, FilterChipComponent, BottomSheetComponent, TranslatePipe],
  template: `
    <ui-filter-chip [label]="label() || ('ui.date_range.period' | translate)" [value]="summary()" [active]="true" (chipClick)="sheet.open()">
      <ion-icon icon name="calendar-outline"></ion-icon>
    </ui-filter-chip>

    <ui-bottom-sheet
      #sheet
      [title]="'ui.date_range.title' | translate"
      [sub]="'ui.date_range.subtitle' | translate"
      [saveLabel]="'ui.apply' | translate"
      (willOpen)="draft.set(value())"
      (save)="save()">
      <div class="presets">
        @for (p of presets(); track p.id) {
          <button class="preset" [class.preset--sel]="draft() === p.id" (click)="draft.set(p.id)">
            <div class="preset__t">{{ p.label | translate }}</div>
            <div class="preset__d">{{ p.hint }}</div>
          </button>
        }
      </div>

      <div class="cal-label">{{ 'ui.date_range.custom' | translate }}</div>
      <div class="cal">
        <div class="cal__head">
          <span class="cal__month">{{ monthLabel }}</span>
        </div>
        <div class="cal__grid">
          @for (d of dow; track d) { <div class="cal__dow">{{ d }}</div> }
          @for (cell of cells; track $index) {
            @if (cell === null) {
              <div></div>
            } @else {
              <div class="cal__day" [class.cal__day--end]="cell === today">{{ cell }}</div>
            }
          }
        </div>
      </div>
    </ui-bottom-sheet>
  `,
  styleUrl: './date-range-picker.component.scss',
})
export class DateRangePickerComponent {
  readonly label = input('');
  readonly value = input<string>('24h');
  readonly presets = input<DateRangePreset[]>(DEFAULT_PRESETS);

  readonly valueChange = output<string>();

  private readonly t = inject(TranslateService);

  protected readonly draft = signal<string>('24h');

  protected readonly summary = computed(() => {
    const key = this.presets().find(p => p.id === this.value())?.label;
    return key ? this.t.instant(key) : this.t.instant('ui.date_range.custom_short');
  });

  // Static current-month grid (read-only visual).
  protected readonly dow = DOW;
  protected readonly monthLabel: string;
  protected readonly today: number;
  protected readonly cells: (number | null)[];

  constructor() {
    const now = new Date();
    this.today = now.getDate();
    this.monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const year = now.getFullYear();
    const month = now.getMonth();
    const leading = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    this.cells = [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
  }

  protected save(): void {
    this.valueChange.emit(this.draft());
  }
}
