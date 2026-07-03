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
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TopbarService } from '@ng/shell/topbar.service';
import {
  AlertController,
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
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';
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
  private readonly t = inject(TranslateService);
  private readonly http = inject(HttpClient);
  private readonly alertCtrl = inject(AlertController);
  private readonly baseUrl = inject(ApiConfiguration).rootUrl;

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
    this.topbar.set('settings.tabs.security');
    try {
      const data = await this.api.invoke(getSecuritySettings, {});
      // twoFactorEnabled (User row) is the source of truth — not the pref.
      const twoFactorOn = (data as { twoFactorEnabled?: boolean }).twoFactorEnabled === true;
      this.securityForm.patchValue({
        twoFactorAuth: twoFactorOn,
        sessionTimeout: parseInt(data.sessionTimeout ?? '30', 10) || 30,
        loginNotifications: data.loginNotifications === 'true',
      }, { emitEvent: false });
    } catch {
      this.securityError.set(this.t.instant('settings.security.msg_load_failed'));
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
      // 2FA is managed by its own verified flow (onTwoFactorToggle); the backend
      // ignores twoFactorAuth here for enable/disable. We still send the current
      // (real) value so the persisted pref matches the actual state.
      const body: SecuritySettings = {
        twoFactorAuth: String(vals.twoFactorAuth) as 'true' | 'false',
        sessionTimeout: String(vals.sessionTimeout),
        loginNotifications: String(vals.loginNotifications) as 'true' | 'false',
      };
      await this.api.invoke(updateSecuritySettings, { body });
      this.securitySuccess.set(this.t.instant('settings.security.msg_updated'));
      this.securityForm.markAsPristine();
    } catch (err) {
      this.securityError.set(
        err instanceof Error ? err.message : 'Failed to update security settings',
      );
    } finally {
      this.isSavingSecurity.set(false);
    }
  }

  private setTwoFactor(on: boolean): void {
    this.securityForm.controls.twoFactorAuth.setValue(on, { emitEvent: false });
  }

  /**
   * 2FA toggle. Enabling emails a code and requires confirming it in a modal
   * (never enabled without proof); disabling asks for confirmation. The toggle
   * reverts if the flow is cancelled or fails, so its state always matches
   * reality on the server.
   */
  async onTwoFactorToggle(event: Event): Promise<void> {
    const checked = (event as CustomEvent<{ checked: boolean }>).detail?.checked;
    if (checked === undefined) return;
    this.securityError.set('');
    this.securitySuccess.set('');
    if (checked) await this.startEnable2fa();
    else await this.startDisable2fa();
  }

  private async startEnable2fa(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/settings/security/2fa/send-code`, {}));
    } catch {
      this.setTwoFactor(false);
      this.securityError.set(this.t.instant('settings.security.two_factor.send_failed'));
      return;
    }
    const alert = await this.alertCtrl.create({
      header: this.t.instant('settings.security.two_factor.enable_title'),
      message: this.t.instant('settings.security.two_factor.enable_msg'),
      inputs: [{ name: 'code', type: 'text', placeholder: '000000', attributes: { inputmode: 'numeric', maxlength: 6 } }],
      buttons: [
        { text: this.t.instant('common.cancel'), role: 'cancel', handler: () => this.setTwoFactor(false) },
        {
          text: this.t.instant('settings.security.two_factor.enable_confirm'),
          handler: (d: { code?: string }) => { void this.confirmEnable2fa((d.code ?? '').trim()); },
        },
      ],
    });
    await alert.present();
  }

  private async confirmEnable2fa(code: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/settings/security/2fa/verify`, { code }));
      this.setTwoFactor(true);
      this.securitySuccess.set(this.t.instant('settings.security.two_factor.enabled'));
    } catch {
      this.setTwoFactor(false);
      this.securityError.set(this.t.instant('settings.security.two_factor.invalid_code'));
    }
  }

  private async startDisable2fa(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.t.instant('settings.security.two_factor.disable_title'),
      message: this.t.instant('settings.security.two_factor.disable_msg'),
      // Step-up: require the current password to disable (verified server-side).
      inputs: [{
        name: 'password',
        type: 'password',
        placeholder: this.t.instant('settings.security.two_factor.disable_password_placeholder'),
      }],
      buttons: [
        { text: this.t.instant('common.cancel'), role: 'cancel', handler: () => this.setTwoFactor(true) },
        {
          text: this.t.instant('settings.security.two_factor.disable_confirm'),
          role: 'destructive',
          handler: (d: { password?: string }) => { void this.confirmDisable2fa(d.password ?? ''); },
        },
      ],
    });
    await alert.present();
  }

  private async confirmDisable2fa(password: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/settings/security/2fa/disable`, { password }));
      this.setTwoFactor(false);
      this.securitySuccess.set(this.t.instant('settings.security.two_factor.disabled'));
    } catch {
      this.setTwoFactor(true);
      this.securityError.set(this.t.instant('settings.security.two_factor.disable_failed'));
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
      this.passwordSuccess.set(this.t.instant('settings.security.msg_password_changed'));
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
      this.sessionError.set(this.t.instant('settings.security.msg_sessions_load_failed'));
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
      this.sessionError.set(this.t.instant('settings.security.msg_session_revoke_failed'));
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
      this.sessionError.set(this.t.instant('settings.security.msg_sessions_revoke_failed'));
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
