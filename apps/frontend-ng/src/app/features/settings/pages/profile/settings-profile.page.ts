import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { getProfileSettings } from '@ng/core/api/generated/fn/settings/get-profile-settings';
import { updateProfileSettings } from '@ng/core/api/generated/fn/settings/update-profile-settings';
import type { ProfileSettings } from '@ng/core/api/generated/models/profile-settings';

const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
];

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
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(true);
  readonly email = signal('');
  readonly username = signal('');

  readonly personalForm = this.fb.nonNullable.group({
    firstName: ['', Validators.maxLength(100)],
    lastName: ['', Validators.maxLength(100)],
    phoneNumber: ['', Validators.maxLength(20)],
  });

  readonly displayForm = this.fb.nonNullable.group({
    language: ['en'],
    timezone: ['UTC'],
    dateFormat: ['MM/DD/YYYY'],
  });

  readonly isSavingPersonal = signal(false);
  readonly isSavingDisplay = signal(false);
  readonly personalError = signal('');
  readonly displayError = signal('');
  readonly personalSuccess = signal('');
  readonly displaySuccess = signal('');

  readonly languageOptions = LANGUAGE_OPTIONS;
  readonly timezoneOptions = TIMEZONE_OPTIONS;
  readonly dateFormatOptions = DATE_FORMAT_OPTIONS;

  async ngOnInit(): Promise<void> {
    try {
      const res = await this.api.invoke(getProfileSettings, {});
      const data = (res as unknown as { data?: typeof res }).data ?? res;
      this.email.set(data.email ?? '');
      this.username.set(data.username ?? '');
      this.personalForm.patchValue({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        phoneNumber: data.phoneNumber ?? '',
      });
      this.displayForm.patchValue({
        language: data.language ?? 'en',
        timezone: data.timezone ?? 'UTC',
        dateFormat: data.dateFormat ?? 'MM/DD/YYYY',
      });
    } catch {
      // silently skip — legacy also only logs to console on load failure
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSavePersonal(): Promise<void> {
    if (this.personalForm.invalid) return;
    this.isSavingPersonal.set(true);
    this.personalError.set('');
    this.personalSuccess.set('');
    try {
      await this.api.invoke(updateProfileSettings, {
        body: { ...this.displayForm.getRawValue(), ...this.personalForm.getRawValue() } as ProfileSettings,
      });
      this.personalSuccess.set('Personal information saved');
      this.personalForm.markAsPristine();
    } catch (err) {
      this.personalError.set(
        err instanceof Error ? err.message : 'Failed to update personal info',
      );
    } finally {
      this.isSavingPersonal.set(false);
    }
  }

  async onSaveDisplay(): Promise<void> {
    if (this.displayForm.invalid) return;
    this.isSavingDisplay.set(true);
    this.displayError.set('');
    this.displaySuccess.set('');
    try {
      await this.api.invoke(updateProfileSettings, {
        body: { ...this.personalForm.getRawValue(), ...this.displayForm.getRawValue() } as ProfileSettings,
      });
      this.displaySuccess.set('Display preferences saved');
      this.displayForm.markAsPristine();
    } catch (err) {
      this.displayError.set(
        err instanceof Error ? err.message : 'Failed to update preferences',
      );
    } finally {
      this.isSavingDisplay.set(false);
    }
  }
}
