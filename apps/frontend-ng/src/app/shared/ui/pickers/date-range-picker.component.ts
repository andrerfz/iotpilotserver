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

/** Emitted value: a preset id, or a custom range with combined date+time bounds (ISO). */
export type DateRangeValue = string | { start: string; end: string };

const DEFAULT_PRESETS: DateRangePreset[] = [
  { id: '1h', label: 'ui.date_range.last_hour', hint: 'now − 60m' },
  { id: '24h', label: 'ui.date_range.last_24h', hint: 'now − 24h' },
  { id: '7d', label: 'ui.date_range.last_7d', hint: 'now − 7d' },
  { id: '30d', label: 'ui.date_range.last_30d', hint: 'now − 30d' },
];

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function combineDateTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/**
 * Date range picker — presets (1h/24h/7d/30d) plus a real interactive
 * mini-calendar for a custom range: click a day for the start, click another
 * for the end (order-independent), navigate months, and optionally narrow
 * each end down to a time of day.
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
      (willOpen)="onWillOpen()"
      (save)="save()">
      <div class="presets">
        @for (p of presets(); track p.id) {
          <button class="preset" [class.preset--sel]="mode() === 'preset' && draftPreset() === p.id" (click)="selectPreset(p.id)">
            <div class="preset__t">{{ p.label | translate }}</div>
            <div class="preset__d">{{ p.hint }}</div>
          </button>
        }
      </div>

      <div class="cal-label">{{ 'ui.date_range.custom' | translate }}</div>
      <div class="cal">
        <div class="cal__head">
          <button class="cal__nav" type="button" (click)="prevMonth()">
            <ion-icon icon name="chevron-back"></ion-icon>
          </button>
          <span class="cal__month">{{ monthLabel }}</span>
          <button class="cal__nav" type="button" (click)="nextMonth()">
            <ion-icon icon name="chevron-forward"></ion-icon>
          </button>
        </div>
        <div class="cal__grid">
          @for (d of dow; track d) { <div class="cal__dow">{{ d }}</div> }
          @for (cell of cells(); track $index) {
            @if (cell === null) {
              <div></div>
            } @else {
              <button type="button" class="cal__day" [class]="dayClass(cell)" (click)="onDayClick(cell)">{{ cell }}</button>
            }
          }
        </div>
      </div>

      @if (mode() === 'custom') {
        <div class="cal-time-row">
          <label class="field">
            <span class="cal-time-label">{{ 'ui.date_range.start_time' | translate }}</span>
            <input type="time" [value]="startTime()" (input)="startTime.set($any($event.target).value)" />
          </label>
          <label class="field">
            <span class="cal-time-label">{{ 'ui.date_range.end_time' | translate }}</span>
            <input type="time" [value]="endTime()" (input)="endTime.set($any($event.target).value)" />
          </label>
        </div>
      }
    </ui-bottom-sheet>
  `,
  styleUrl: './date-range-picker.component.scss',
})
export class DateRangePickerComponent {
  readonly label = input('');
  readonly value = input<DateRangeValue>('24h');
  readonly presets = input<DateRangePreset[]>(DEFAULT_PRESETS);

  readonly valueChange = output<DateRangeValue>();

  private readonly t = inject(TranslateService);

  protected readonly mode = signal<'preset' | 'custom'>('preset');
  protected readonly draftPreset = signal<string>('24h');

  protected readonly selStart = signal<Date | null>(null);
  protected readonly selEnd = signal<Date | null>(null);
  protected readonly startTime = signal<string>('00:00');
  protected readonly endTime = signal<string>('23:59');

  protected readonly viewYear = signal<number>(new Date().getFullYear());
  protected readonly viewMonth = signal<number>(new Date().getMonth());

  protected readonly summary = computed(() => {
    const v = this.value();
    if (typeof v === 'string') {
      const key = this.presets().find(p => p.id === v)?.label;
      return key ? this.t.instant(key) : this.t.instant('ui.date_range.custom_short');
    }
    const lang = this.t.getCurrentLang() || 'en';
    const fmt = (iso: string) => new Date(iso).toLocaleDateString(lang, { month: 'short', day: 'numeric' });
    return `${fmt(v.start)} – ${fmt(v.end)}`;
  });

  protected readonly dow = DOW;

  /** Only non-null when the currently-displayed month is the real current month. */
  protected readonly today = computed<number | null>(() => {
    const now = new Date();
    return this.viewYear() === now.getFullYear() && this.viewMonth() === now.getMonth() ? now.getDate() : null;
  });

  protected readonly cells = computed<(number | null)[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const leading = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
  });

  /** Month + year header, localized to the active UI language. Getter so it
   *  follows both a runtime language switch and month navigation. */
  protected get monthLabel(): string {
    const d = new Date(this.viewYear(), this.viewMonth(), 1);
    return d.toLocaleString(this.t.getCurrentLang() || 'en', { month: 'long', year: 'numeric' });
  }

  protected onWillOpen(): void {
    const v = this.value();
    if (typeof v === 'string') {
      this.mode.set('preset');
      this.draftPreset.set(v);
      this.selStart.set(null);
      this.selEnd.set(null);
      const now = new Date();
      this.viewYear.set(now.getFullYear());
      this.viewMonth.set(now.getMonth());
      return;
    }

    this.mode.set('custom');
    const s = new Date(v.start);
    const e = new Date(v.end);
    this.selStart.set(new Date(s.getFullYear(), s.getMonth(), s.getDate()));
    this.selEnd.set(new Date(e.getFullYear(), e.getMonth(), e.getDate()));
    this.startTime.set(`${pad2(s.getHours())}:${pad2(s.getMinutes())}`);
    this.endTime.set(`${pad2(e.getHours())}:${pad2(e.getMinutes())}`);
    this.viewYear.set(s.getFullYear());
    this.viewMonth.set(s.getMonth());
  }

  protected selectPreset(id: string): void {
    this.mode.set('preset');
    this.draftPreset.set(id);
    this.selStart.set(null);
    this.selEnd.set(null);
  }

  protected prevMonth(): void {
    let m = this.viewMonth() - 1;
    let y = this.viewYear();
    if (m < 0) { m = 11; y -= 1; }
    this.viewMonth.set(m);
    this.viewYear.set(y);
  }

  protected nextMonth(): void {
    let m = this.viewMonth() + 1;
    let y = this.viewYear();
    if (m > 11) { m = 0; y += 1; }
    this.viewMonth.set(m);
    this.viewYear.set(y);
  }

  protected onDayClick(day: number): void {
    const clicked = new Date(this.viewYear(), this.viewMonth(), day);
    const start = this.selStart();
    const end = this.selEnd();

    if (!start || (start && end)) {
      this.selStart.set(clicked);
      this.selEnd.set(null);
    } else if (clicked.getTime() < start.getTime()) {
      this.selEnd.set(start);
      this.selStart.set(clicked);
    } else {
      this.selEnd.set(clicked);
    }

    this.mode.set('custom');
  }

  protected dayClass(day: number): Record<string, boolean> {
    const d = new Date(this.viewYear(), this.viewMonth(), day).getTime();
    const start = this.selStart()?.getTime();
    const end = this.selEnd()?.getTime();
    const isEnd = d === start || d === end;
    const inRange = start !== undefined && end !== undefined && d > Math.min(start, end) && d < Math.max(start, end);
    return {
      'cal__day--end': isEnd,
      'cal__day--range': inRange,
      'cal__day--today': !isEnd && day === this.today(),
    };
  }

  protected save(): void {
    if (this.mode() === 'custom' && this.selStart()) {
      const startDay = this.selStart()!;
      const endDay = this.selEnd() ?? startDay;
      const start = combineDateTime(startDay, this.startTime());
      const end = combineDateTime(endDay, this.endTime());
      this.valueChange.emit({ start: start.toISOString(), end: end.toISOString() });
    } else {
      this.valueChange.emit(this.draftPreset());
    }
  }
}
