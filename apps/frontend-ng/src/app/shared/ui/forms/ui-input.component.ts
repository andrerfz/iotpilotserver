import {
  Component,
  forwardRef,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { IonInput, IonLabel, IonNote, IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline } from 'ionicons/icons';

addIcons({ eyeOutline, eyeOffOutline });

@Component({
  selector: 'ui-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonInput, IonLabel, IonNote, IonButton, IonIcon, TranslatePipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="ui-field" [class.ui-field--error]="!!error()">
      @if (label()) {
        <ion-label class="ui-field__label">{{ label() }}</ion-label>
      }
      @if (loading()) {
        <span class="sk ui-input-sk"></span>
      } @else {
        <ion-input
          class="ui-input"
          [type]="showPassword() ? 'text' : effectiveType()"
          [placeholder]="placeholder()"
          [disabled]="isDisabled()"
          [value]="value()"
          (ionInput)="onInput($event)"
          (ionBlur)="onTouched()">
          @if (effectiveType() === 'password') {
            <ion-button
              slot="end"
              fill="clear"
              size="small"
              class="ui-input__reveal"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="(showPassword() ? 'ui.input.hide_password' : 'ui.input.show_password') | translate">
              <ion-icon slot="icon-only" [name]="showPassword() ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
            </ion-button>
          }
        </ion-input>
        @if (error()) {
          <ion-note class="ui-field__error" color="danger">{{ error() }}</ion-note>
        }
      }
    </div>
  `,
  styleUrl: './ui-input.component.scss',
})
export class UiInputComponent implements ControlValueAccessor {
  readonly label = input('');
  readonly placeholder = input('');
  readonly type = input<string>('text');
  readonly loading = input(false);
  /** Error message to display. Pass AbstractControl's first error or empty string. */
  readonly error = input('');

  protected readonly value = signal<string>('');
  protected readonly isDisabled = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly effectiveType = () => this.type();

  private onChange: (v: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(v: string | null): void {
    this.value.set(v ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
  }

  protected onInput(event: Event): void {
    const val = (event as CustomEvent<{ value: string }>).detail?.value ?? '';
    this.value.set(val);
    this.onChange(val);
  }
}
