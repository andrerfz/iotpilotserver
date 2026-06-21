import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AppLogoComponent,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonInput,
  IonSpinner,
  UiCheckboxComponent,
  UiInputComponent,
} from '@ng/shared/ui';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@ng/core/auth/auth.service';
import { ToastService } from '@ng/core/errors/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonInput,
    IonSpinner,
    AppLogoComponent,
    UiInputComponent,
    UiCheckboxComponent,
    TranslatePipe,
  ],
})
export class LoginPage {
  @ViewChild('twoFaInput') private twoFaInput?: IonInput;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false],
  });

  readonly step = signal<'credentials' | '2fa'>('credentials');
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly code = signal('');
  readonly twoFaError = signal('');

  private userId = '';

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set('');

    const { email, password, remember } = this.form.getRawValue();
    try {
      const result = await this.auth.login(email, password, remember);
      if (result.status === 'authenticated') {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/app';
        await this.router.navigateByUrl(returnUrl);
      } else {
        this.userId = result.userId;
        this.step.set('2fa');
        void this.toast.success(this.translate.instant('auth.login.toast_code_sent'));
        setTimeout(() => void this.twoFaInput?.setFocus(), 0);
      }
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onVerify(): Promise<void> {
    if (!this.code()) return;
    this.isLoading.set(true);
    this.twoFaError.set('');

    try {
      await this.auth.verifyTwoFactor(this.userId, this.code(), this.form.getRawValue().remember);
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/app';
      await this.router.navigateByUrl(returnUrl);
    } catch (err) {
      this.code.set('');
      this.twoFaError.set(err instanceof Error ? err.message : 'Verification failed');
      setTimeout(() => void this.twoFaInput?.setFocus(), 0);
    } finally {
      this.isLoading.set(false);
    }
  }

  onBack(): void {
    this.step.set('credentials');
    this.code.set('');
    this.twoFaError.set('');
  }

  onCodeInput(event: Event): void {
    const raw = (event as CustomEvent<{ value: string | null | undefined }>).detail?.value ?? '';
    this.code.set(raw.replace(/\D/g, '').slice(0, 6));
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
    if (!ctrl.touched || !ctrl.hasError('required')) return '';
    return 'Password is required';
  }
}
