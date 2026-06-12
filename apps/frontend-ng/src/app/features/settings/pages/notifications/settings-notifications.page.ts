import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonSpinner,
  IonToggle,
} from '@ng/shared/ui';
import { Api } from '@ng/core/api/generated/api';
import { getNotificationSettings } from '@ng/core/api/generated/fn/settings/get-notification-settings';
import { updateNotificationSettings } from '@ng/core/api/generated/fn/settings/update-notification-settings';
import type { NotificationSettings } from '@ng/core/api/generated/models/notification-settings';

@Component({
  selector: 'app-settings-notifications',
  templateUrl: 'settings-notifications.page.html',
  styleUrls: ['settings-notifications.page.scss'],
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
    IonToggle,
  ],
})
export class SettingsNotificationsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    emailNotifications: [true],
    pushNotifications: [false],
    alertNotifications: [true],
    deviceOfflineNotifications: [true],
  });

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.api.invoke(getNotificationSettings, {});
      this.form.patchValue({
        emailNotifications: data.emailNotifications === 'true',
        pushNotifications: data.pushNotifications === 'true',
        alertNotifications: data.alertNotifications === 'true',
        deviceOfflineNotifications: data.deviceOfflineNotifications === 'true',
      });
    } catch {
      this.errorMessage.set('Failed to load notification settings');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSave(): Promise<void> {
    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    try {
      const vals = this.form.getRawValue();
      const body: NotificationSettings = {
        emailNotifications: String(vals.emailNotifications) as 'true' | 'false',
        pushNotifications: String(vals.pushNotifications) as 'true' | 'false',
        alertNotifications: String(vals.alertNotifications) as 'true' | 'false',
        deviceOfflineNotifications: String(vals.deviceOfflineNotifications) as 'true' | 'false',
      };
      await this.api.invoke(updateNotificationSettings, { body });
      this.successMessage.set('Notification settings updated successfully');
      this.form.markAsPristine();
    } catch (err) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Failed to update notification settings',
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
