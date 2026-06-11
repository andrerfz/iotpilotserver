import {
  Component,
  forwardRef,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { IonNote } from '@ionic/angular/standalone';

/**
 * Prototype-visual checkbox: custom styled span with SVG check mark.
 * Does NOT use IonCheckbox so we can match the prototype's exact look
 * (checkbox.checkbox--on with inner Icon check).
 */
@Component({
  selector: 'ui-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonNote],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiCheckboxComponent),
      multi: true,
    },
  ],
  template: `
    <div class="ui-checkbox-wrap">
      <label class="ui-checkbox-label" [class.ui-checkbox-label--disabled]="isDisabled()">
        <input
          type="checkbox"
          class="cb-native"
          [checked]="value()"
          [disabled]="isDisabled()"
          (change)="onNativeChange($event)"
          (blur)="onTouched()" />
        <span class="checkbox" [class.checkbox--on]="value()" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
            width="12" height="12">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
        @if (label()) {
          <span class="ui-checkbox-text">{{ label() }}</span>
        }
      </label>
      @if (error()) {
        <ion-note class="ui-checkbox__error" color="danger">{{ error() }}</ion-note>
      }
    </div>
  `,
  styleUrl: './ui-checkbox.component.css',
})
export class UiCheckboxComponent implements ControlValueAccessor {
  readonly label = input('');
  readonly error = input('');

  protected readonly value = signal(false);
  protected readonly isDisabled = signal(false);

  private onChangeFn: (v: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(v: boolean | null): void {
    this.value.set(!!v);
  }

  registerOnChange(fn: (v: boolean) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
  }

  protected onNativeChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.value.set(checked);
    this.onChangeFn(checked);
  }
}
