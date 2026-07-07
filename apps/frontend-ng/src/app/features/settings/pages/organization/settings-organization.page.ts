import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
  IonToggle,
  UiInputComponent,
} from '@ng/shared/ui';
import { Api } from '@ng/core/api/generated/api';
import { TopbarService } from '@ng/shell/topbar.service';
import { getOrganizationProfile } from '@ng/core/api/generated/fn/settings/get-organization-profile';
import { updateOrganizationProfile } from '@ng/core/api/generated/fn/settings/update-organization-profile';
import type { OrganizationProfileInput } from '@ng/core/api/generated/models/organization-profile-input';

@Component({
  selector: 'app-settings-organization',
  templateUrl: 'settings-organization.page.html',
  styleUrl: 'settings-organization.page.scss',
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
    IonToggle,
    UiInputComponent,
  ],
})
export class SettingsOrganizationPage implements OnInit {
  private readonly api = inject(Api);
  private readonly topbar = inject(TopbarService);
  private readonly fb = inject(FormBuilder);
  private readonly t = inject(TranslateService);

  readonly isLoading = signal(true);
  readonly domain = signal('');
  readonly status = signal('');

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    contactEmail: ['', Validators.email],
    description: ['', Validators.maxLength(1000)],
    alertDedupEnabled: [false],
  });

  readonly isSaving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  async ngOnInit(): Promise<void> {
    this.topbar.set('settings.tabs.organization');
    try {
      const res = await this.api.invoke(getOrganizationProfile, {});
      const data = (res as unknown as { data?: typeof res }).data ?? res;
      this.domain.set(data.domain ?? '');
      this.status.set(data.status ?? '');
      this.form.patchValue({
        name: data.name ?? '',
        contactEmail: data.contactEmail ?? '',
        description: data.description ?? '',
        alertDedupEnabled: data.alertDedupEnabled ?? false,
      });
    } catch {
      this.error.set(this.t.instant('settings.organization.msg_load_failed'));
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
      const vals = this.form.getRawValue();
      const body: OrganizationProfileInput = {
        name: vals.name,
        contactEmail: vals.contactEmail || null,
        description: vals.description || null,
        alertDedupEnabled: vals.alertDedupEnabled,
      };
      await this.api.invoke(updateOrganizationProfile, { body });
      this.success.set(this.t.instant('settings.organization.msg_saved'));
      this.form.markAsPristine();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : this.t.instant('settings.organization.msg_save_failed'));
    } finally {
      this.isSaving.set(false);
    }
  }
}
