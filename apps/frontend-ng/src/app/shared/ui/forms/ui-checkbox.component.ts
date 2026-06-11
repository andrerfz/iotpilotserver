import {
  Component,
  forwardRef,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { NgIf } from '@angular/common';
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
  imports: [NgIf, IonNote],
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
        <span *ngIf="label()" class="ui-checkbox-text">{{ label() }}</span>
      </label>
      <ion-note *ngIf="error()" class="ui-checkbox__error" color="danger">{{ error() }}</ion-note>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ui-checkbox-wrap { display: flex; flex-direction: column; gap: 4px; }
    .ui-checkbox-label {
      display: inline-flex; align-items: center; gap: 10px;
      cursor: pointer; user-select: none;
    }
    .ui-checkbox-label--disabled { opacity: 0.5; cursor: not-allowed; }
    /* Hide the native input visually but keep it accessible */
    .cb-native {
      position: absolute; width: 1px; height: 1px; overflow: hidden;
      clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
    .checkbox {
      width: 18px; height: 18px; border-radius: 4px;
      border: 1.5px solid var(--border-strong);
      background: var(--surface-2);
      display: inline-flex; align-items: center; justify-content: center;
      flex: none; transition: background 0.12s, border-color 0.12s;
      color: transparent; pointer-events: none;
    }
    .checkbox--on {
      background: var(--primary); border-color: var(--primary);
      color: var(--primary-ink);
    }
    .ui-checkbox-text { font-size: 14px; color: var(--text); }
    .ui-checkbox__error { font-size: 12px; color: var(--danger); }
  `],
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
