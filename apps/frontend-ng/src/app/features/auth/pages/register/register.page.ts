import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
import { register as registerFn } from '@ng/core/api/generated/fn/auth/register';
import { ApiError } from '@ng/core/errors/api-error';
import { ToastService } from '@ng/core/errors/toast.service';
import { PasswordStrengthComponent } from '../../components/password-strength/password-strength.component';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value as string;
  const cpw = group.get('confirmPassword')?.value as string;
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  templateUrl: 'register.page.html',
  styleUrls: ['register.page.scss'],
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
export class RegisterPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(12)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set('');

    const { username, email, password } = this.form.getRawValue();
    try {
      const res = await this.api.invoke(registerFn, { body: { username, email, password } });
      if (res.data?.requiresApproval) {
        void this.toast.success(this.translate.instant('auth.register.toast_submitted'));
      } else {
        void this.toast.success(this.translate.instant('auth.register.toast_created'));
      }
      await this.router.navigate(['/login']);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        this.errorMessage.set(this.translate.instant('auth.register.error_email_exists'));
      } else {
        this.errorMessage.set(err instanceof Error ? err.message : this.translate.instant('errors.fallback'));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  usernameError(): string {
    const ctrl = this.form.controls.username;
    if (!ctrl.touched) return '';
    if (ctrl.hasError('required')) return 'Username is required';
    if (ctrl.hasError('minlength')) return 'Username must be at least 3 characters';
    return '';
  }

  emailError(): string {
    const ctrl = this.form.controls.email;
    if (!ctrl.touched) return '';
    if (ctrl.hasError('required')) return 'Email is required';
    if (ctrl.hasError('email')) return 'Enter a valid email address';
    return '';
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
