import {
  Component,
  forwardRef,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { IonSelect, IonSelectOption, IonLabel, IonNote } from '@ionic/angular/standalone';

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'ui-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonSelect, IonSelectOption, IonLabel, IonNote],
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
      <ion-select
        class="ui-select"
        interface="popover"
        [placeholder]="placeholder()"
        [disabled]="isDisabled()"
        [value]="value()"
        (ionChange)="onChange($event)"
        (ionBlur)="onTouched()">
        @for (opt of options(); track opt.value) {
          <ion-select-option [value]="opt.value">
            {{ opt.label }}
          </ion-select-option>
        }
      </ion-select>
      @if (error()) {
        <ion-note class="ui-field__error" color="danger">{{ error() }}</ion-note>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ui-field { display: flex; flex-direction: column; gap: 4px; }
    .ui-field__label {
      font-size: 12px; font-weight: 550; color: var(--text-muted);
      font-family: var(--font-mono); letter-spacing: var(--ls-label);
      text-transform: uppercase; margin-bottom: 2px;
    }
    .ui-select {
      --background: var(--surface-2);
      --color: var(--text);
      --placeholder-color: var(--text-dim);
      --border-radius: var(--r-sm);
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      width: 100%;
    }
    .ui-field--error .ui-select { border-color: var(--danger); }
    .ui-field__error { font-size: 12px; color: var(--danger); }
  `],
})
export class UiSelectComponent<T = string> implements ControlValueAccessor {
  readonly label = input('');
  readonly placeholder = input('Select…');
  readonly error = input('');
  readonly options = input<SelectOption<T>[]>([]);

  protected readonly value = signal<T | null>(null);
  protected readonly isDisabled = signal(false);

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

  protected onChange(event: Event): void {
    const val = (event as CustomEvent<{ value: T }>).detail?.value ?? null;
    this.value.set(val);
    this.onChangeFn(val);
  }
}
