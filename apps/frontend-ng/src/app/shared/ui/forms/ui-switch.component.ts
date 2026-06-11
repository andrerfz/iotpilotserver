import {
  Component,
  forwardRef,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { NgIf } from '@angular/common';
import { IonToggle, IonLabel, IonNote } from '@ionic/angular/standalone';

@Component({
  selector: 'ui-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, IonToggle, IonLabel, IonNote],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiSwitchComponent),
      multi: true,
    },
  ],
  template: `
    <div class="ui-switch-wrap">
      <ion-toggle
        class="ui-toggle"
        [checked]="value()"
        [disabled]="isDisabled()"
        (ionChange)="onChange($event)"
        (ionBlur)="onTouched()">
        <ion-label *ngIf="label()">{{ label() }}</ion-label>
      </ion-toggle>
      <ion-note *ngIf="error()" class="ui-switch__error" color="danger">{{ error() }}</ion-note>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ui-switch-wrap { display: flex; flex-direction: column; gap: 4px; }
    .ui-toggle {
      --track-background: var(--surface-3);
      --track-background-checked: var(--primary);
      --handle-background: var(--text);
    }
    .ui-switch__error { font-size: 12px; color: var(--danger); }
  `],
})
export class UiSwitchComponent implements ControlValueAccessor {
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

  protected onChange(event: Event): void {
    const checked = (event as CustomEvent<{ checked: boolean }>).detail?.checked ?? false;
    this.value.set(checked);
    this.onChangeFn(checked);
  }
}
