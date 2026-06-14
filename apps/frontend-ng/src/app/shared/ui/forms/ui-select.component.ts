import {
  Component, forwardRef, input, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { IonLabel, IonNote, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDown, checkmark } from 'ionicons/icons';
import { BottomSheetComponent } from '../sheets/bottom-sheet.component';

addIcons({ chevronDown, checkmark });

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

/**
 * Single-select form control. The field opens a BottomSheet of options (iOS-style
 * sheet, stacking above any parent sheet) with Apply/Cancel — not a popover, so it
 * behaves the same in forms and nested inside other sheets. Multi-select is the
 * MultiSelectPicker. ControlValueAccessor over the value.
 */
@Component({
  selector: 'ui-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonLabel, IonNote, IonIcon, BottomSheetComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="ui-field" [class.ui-field--error]="!!error()">
      @if (label()) {
        <ion-label class="ui-field__label">{{ label() }}</ion-label>
      }

      @if (loading()) {
        <span class="sk ui-select-sk"></span>
      } @else {
        <button type="button" class="ui-select" [disabled]="isDisabled()"
          (click)="sheet.open()" (blur)="onTouched()">
          <span class="ui-select__value" [class.ui-select__value--placeholder]="!selectedLabel()">
            {{ selectedLabel() || placeholder() }}
          </span>
          <ion-icon name="chevron-down" class="ui-select__chev"></ion-icon>
        </button>
        @if (error()) {
          <ion-note class="ui-field__error" color="danger">{{ error() }}</ion-note>
        }
      }

      <ui-bottom-sheet
        #sheet
        [title]="label() || 'Select'"
        saveLabel="Apply"
        (willOpen)="draft.set(value())"
        (save)="commit()">
        <div class="optlist">
          @for (opt of options(); track opt.value) {
            <div class="opt" [class.opt--sel]="draft() === opt.value"
              role="button" tabindex="0"
              (click)="draft.set(opt.value)"
              (keydown.enter)="draft.set(opt.value)"
              (keydown.space)="draft.set(opt.value)">
              <div class="opt__main"><div class="opt__title">{{ opt.label }}</div></div>
              <div class="opt__check">
                <ion-icon name="checkmark"></ion-icon>
              </div>
            </div>
          }
        </div>
      </ui-bottom-sheet>
    </div>
  `,
  styleUrl: './ui-select.component.scss',
})
export class UiSelectComponent<T = string> implements ControlValueAccessor {
  readonly label = input('');
  readonly placeholder = input('Select…');
  readonly loading = input(false);
  readonly error = input('');
  readonly options = input<SelectOption<T>[]>([]);

  protected readonly value = signal<T | null>(null);
  protected readonly draft = signal<T | null>(null);
  protected readonly isDisabled = signal(false);

  protected readonly selectedLabel = computed(() =>
    this.options().find(o => o.value === this.value())?.label ?? '',
  );

  private onChangeFn: (v: T | null) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(v: T | null): void {
    this.value.set(v);
  }

  registerOnChange(fn: (v: T | null) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
  }

  protected commit(): void {
    this.value.set(this.draft());
    this.onChangeFn(this.draft());
    this.onTouched();
  }
}
