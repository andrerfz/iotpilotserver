import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LangService, SUPPORTED_LANGS, LANG_LABELS } from '@ng/core/i18n/lang.service';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  UiInputComponent,
  UiSelectComponent,
} from '@ng/shared/ui';
import type { SelectOption } from '@ng/shared/ui';
import { Api } from '@ng/core/api/generated/api';
import { TopbarService } from '@ng/shell/topbar.service';
import { getProfileSettings } from '@ng/core/api/generated/fn/settings/get-profile-settings';
import { updateProfileSettings } from '@ng/core/api/generated/fn/settings/update-profile-settings';
import type { ProfileSettings } from '@ng/core/api/generated/models/profile-settings';

const LANGUAGE_OPTIONS: SelectOption[] = SUPPORTED_LANGS.map((lang) => ({
  value: lang,
  label: LANG_LABELS[lang],
}));

const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
];

const DATE_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

@Component({
  selector: 'app-settings-profile',
  templateUrl: 'settings-profile.page.html',
  styleUrls: ['settings-profile.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
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
    IonNote,
    UiInputComponent,
    UiSelectComponent,
  ],
})
export class SettingsProfilePage implements OnInit {
  private readonly api = inject(Api);
  private readonly topbar = inject(TopbarService);
  private readonly fb = inject(FormBuilder);
  private readonly lang = inject(LangService);

  readonly isLoading = signal(true);
  readonly email = signal('');
  readonly username = signal('');

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.maxLength(100)],
    lastName: ['', Validators.maxLength(100)],
    phoneNumber: ['', Validators.maxLength(20)],
    language: ['en'],
    timezone: ['UTC'],
    dateFormat: ['MM/DD/YYYY'],
  });

  readonly isSaving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly languageOptions = LANGUAGE_OPTIONS;
  readonly timezoneOptions = TIMEZONE_OPTIONS;
  readonly dateFormatOptions = DATE_FORMAT_OPTIONS;

  async ngOnInit(): Promise<void> {
    this.topbar.set('Profile');
    try {
      const res = await this.api.invoke(getProfileSettings, {});
      const data = (res as unknown as { data?: typeof res }).data ?? res;
      this.email.set(data.email ?? '');
      this.username.set(data.username ?? '');
      this.form.patchValue({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        phoneNumber: data.phoneNumber ?? '',
        language: data.language ?? this.lang.current,
        timezone: data.timezone ?? 'UTC',
        dateFormat: data.dateFormat ?? 'MM/DD/YYYY',
      });
    } catch {
      // silently skip — legacy also only logs to console on load failure
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSave(): Promise<void> {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    this.error.set('');
    this.success.set('');
    try {
      await this.api.invoke(updateProfileSettings, {
        body: this.form.getRawValue() as ProfileSettings,
      });
      const lang = this.form.getRawValue().language;
      if (lang) await this.lang.use(lang as Parameters<typeof this.lang.use>[0]);
      this.success.set('Changes saved');
      this.form.markAsPristine();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      this.isSaving.set(false);
    }
  }
}
