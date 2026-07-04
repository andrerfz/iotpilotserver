import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AppLogoComponent,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonSpinner,
  UiInputComponent,
} from '@ng/shared/ui';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Api } from '@ng/core/api/generated/api';
import { acceptInvite } from '@ng/core/api/generated/fn/auth/accept-invite';
import { ApiError } from '@ng/core/errors/api-error';
import { ToastService } from '@ng/core/errors/toast.service';
import { PasswordStrengthComponent } from '../../components/password-strength/password-strength.component';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value as string;
  const cpw = group.get('confirmPassword')?.value as string;
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-accept-invite',
  templateUrl: 'accept-invite.page.html',
  styleUrls: ['accept-invite.page.scss'],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonSpinner,
    AppLogoComponent,
    UiInputComponent,
    PasswordStrengthComponent,
    TranslatePipe,
  ],
})
export class AcceptInvitePage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly hasToken = signal(this.token.length > 0);

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(12)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  async onSubmit(): Promise<void> {
    if (this.form.invalid || !this.hasToken()) return;
    this.isLoading.set(true);
    this.errorMessage.set('');

    const { password } = this.form.getRawValue();
    try {
      await this.api.invoke(acceptInvite, { body: { token: this.token, password } });
      void this.toast.success(this.translate.instant('auth.accept_invite.toast_success'));
      await this.router.navigate(['/login']);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        this.errorMessage.set(this.translate.instant('auth.accept_invite.error_already_accepted'));
      } else if (err instanceof ApiError && err.status === 400) {
        this.errorMessage.set(this.translate.instant('auth.accept_invite.error_invalid_token'));
      } else {
        this.errorMessage.set(err instanceof Error ? err.message : this.translate.instant('errors.fallback'));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  passwordError(): string {
    const ctrl = this.form.controls.password;
    if (!ctrl.touched) return '';
    if (ctrl.hasError('required')) return 'Password is required';
    if (ctrl.hasError('minlength')) return 'Password must be at least 12 characters';
    return '';
  }

  confirmPasswordError(): string {
    const ctrl = this.form.controls.confirmPassword;
    if (!ctrl.touched) return '';
    if (ctrl.hasError('required')) return 'Please confirm your password';
    if (this.form.hasError('passwordMismatch')) return 'Passwords do not match';
    return '';
  }

  get passwordValue(): string {
    return this.form.controls.password.value;
  }
}
