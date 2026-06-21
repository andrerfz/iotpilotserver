import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TopbarService } from '@ng/shell/topbar.service';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonRange,
  IonSpinner,
  IonToggle,
} from '@ng/shared/ui';
import { Api } from '@ng/core/api/generated/api';
import { AuthService } from '@ng/core/auth/auth.service';
import { getSecuritySettings } from '@ng/core/api/generated/fn/settings/get-security-settings';
import { updateSecuritySettings } from '@ng/core/api/generated/fn/settings/update-security-settings';
import { changePassword } from '@ng/core/api/generated/fn/auth/change-password';
import { listSessions } from '@ng/core/api/generated/fn/auth/list-sessions';
import { revokeSession as revokeSessionFn } from '@ng/core/api/generated/fn/auth/revoke-session';
import { revokeOtherSessions } from '@ng/core/api/generated/fn/auth/revoke-other-sessions';
import { UiInputComponent } from '@ng/shared/ui';
import type { SecuritySettings } from '@ng/core/api/generated/models/security-settings';
import type { Session } from '@ng/core/api/generated/models/session';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const np = group.get('newPassword')?.value as string;
  const cp = group.get('confirmPassword')?.value as string;
  return np && cp && np !== cp ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-settings-security',
  templateUrl: 'settings-security.page.html',
  styleUrls: ['settings-security.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    TranslatePipe,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonSpinner,
    IonItem,
    IonLabel,
    IonList,
    IonToggle,
    IonRange,
    IonInput,
    UiInputComponent,
  ],
})
export class SettingsSecurityPage implements OnInit {
  private readonly api = inject(Api);
  private readonly topbar = inject(TopbarService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);

  readonly securityForm = this.fb.nonNullable.group({
    twoFactorAuth: [false],
    sessionTimeout: [30, [Validators.min(5), Validators.max(1440)]],
    loginNotifications: [true],
  });

  readonly isSavingSecurity = signal(false);
  readonly securityError = signal('');
  readonly securitySuccess = signal('');

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  readonly isChangingPassword = signal(false);
  readonly passwordError = signal('');
  readonly passwordSuccess = signal('');

  readonly showSessions = signal(false);
  readonly sessions = signal<Session[]>([]);
  readonly sessionsLoaded = signal(false);
  readonly isLoadingSessions = signal(false);
  readonly sessionError = signal('');
  readonly sessionMessage = signal('');
  readonly revokingId = signal<string | null>(null);
  readonly isRevokingAll = signal(false);

  async ngOnInit(): Promise<void> {
    this.topbar.set('Security');
    try {
      const data = await this.api.invoke(getSecuritySettings, {});
      this.securityForm.patchValue({
        twoFactorAuth: data.twoFactorAuth === 'true',
        sessionTimeout: parseInt(data.sessionTimeout ?? '30', 10) || 30,
        loginNotifications: data.loginNotifications === 'true',
      });
    } catch {
      this.securityError.set('Failed to load security settings');
    } finally {
      this.isLoading.set(false);
    }
  }

  onSessionTimeoutSliderChange(event: Event): void {
    const value = (event as CustomEvent<{ value: number }>).detail?.value;
    if (typeof value === 'number') {
      this.securityForm.controls.sessionTimeout.setValue(value);
      this.securityForm.markAsDirty();
    }
  }

  onSessionTimeoutInputChange(event: Event): void {
    const raw = (event as CustomEvent<{ value: string }>).detail?.value ?? '';
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(1440, Math.max(5, parsed));
      this.securityForm.controls.sessionTimeout.setValue(clamped);
      this.securityForm.markAsDirty();
    }
  }

  async onSaveSecurity(): Promise<void> {
    this.isSavingSecurity.set(true);
    this.securityError.set('');
    this.securitySuccess.set('');
    try {
      const vals = this.securityForm.getRawValue();
      const body: SecuritySettings = {
        twoFactorAuth: String(vals.twoFactorAuth) as 'true' | 'false',
        sessionTimeout: String(vals.sessionTimeout),
        loginNotifications: String(vals.loginNotifications) as 'true' | 'false',
      };
      await this.api.invoke(updateSecuritySettings, { body });
      this.securitySuccess.set('Security settings updated successfully');
      this.securityForm.markAsPristine();
    } catch (err) {
      this.securityError.set(
        err instanceof Error ? err.message : 'Failed to update security settings',
      );
    } finally {
      this.isSavingSecurity.set(false);
    }
  }

  async onChangePassword(): Promise<void> {
    if (this.passwordForm.invalid) return;
    this.isChangingPassword.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');
    try {
      const { currentPassword, newPassword } = this.passwordForm.getRawValue();
      const result = await this.api.invoke(changePassword, {
        body: { currentPassword, newPassword },
      });
      this.passwordSuccess.set('Password changed successfully');
      this.passwordForm.reset();
      if (result?.wasCurrentSession) {
        await this.auth.logout();
        await this.router.navigate(['/login']);
      }
    } catch (err) {
      this.passwordError.set(
        err instanceof Error ? err.message : 'Failed to change password',
      );
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  async toggleSessions(): Promise<void> {
    const next = !this.showSessions();
    this.showSessions.set(next);
    if (next && !this.sessionsLoaded()) {
      await this.loadSessions();
    }
  }

  async loadSessions(): Promise<void> {
    this.isLoadingSessions.set(true);
    this.sessionError.set('');
    try {
      const res = await this.api.invoke(listSessions, {});
      this.sessions.set(res.data ?? []);
      this.sessionsLoaded.set(true);
    } catch {
      this.sessionError.set('Failed to load sessions');
    } finally {
      this.isLoadingSessions.set(false);
    }
  }

  async onRevokeSession(id: string): Promise<void> {
    this.revokingId.set(id);
    try {
      await this.api.invoke(revokeSessionFn, { id });
      this.sessions.update((s) => s.filter((x) => x.id !== id));
    } catch {
      this.sessionError.set('Failed to revoke session');
    } finally {
      this.revokingId.set(null);
    }
  }

  async onRevokeAllOthers(): Promise<void> {
    this.isRevokingAll.set(true);
    this.sessionMessage.set('');
    try {
      const res = await this.api.invoke(revokeOtherSessions, {});
      const count = res.data?.revokedCount ?? 0;
      this.sessionMessage.set(
        `Revoked ${count} other session${count !== 1 ? 's' : ''}`,
      );
      await this.loadSessions();
    } catch {
      this.sessionError.set('Failed to revoke sessions');
    } finally {
      this.isRevokingAll.set(false);
    }
  }

  get confirmPasswordError(): string {
    const ctrl = this.passwordForm.controls.confirmPassword;
    if (ctrl.touched && ctrl.hasError('required')) return 'Please confirm your password';
    if (ctrl.touched && this.passwordForm.hasError('passwordMismatch'))
      return 'Passwords do not match';
    return '';
  }
}
