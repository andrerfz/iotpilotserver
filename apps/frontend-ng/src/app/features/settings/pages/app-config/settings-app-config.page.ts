import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonSpinner,
} from '@ng/shared/ui';
import { Api } from '@ng/core/api/generated/api';
import { TopbarService } from '@ng/shell/topbar.service';
import { UiSelectComponent, type SelectOption } from '@ng/shared/ui';
import { getSystemSettings } from '@ng/core/api/generated/fn/settings/get-system-settings';
import { updateSystemSettings } from '@ng/core/api/generated/fn/settings/update-system-settings';
import type { SystemSettings } from '@ng/core/api/generated/models/system-settings';

const LOG_LEVEL_OPTIONS: SelectOption[] = [
  { label: 'logs.level_debug', value: 'debug' },
  { label: 'logs.level_info', value: 'info' },
  { label: 'logs.level_warning', value: 'warn' },
  { label: 'logs.level_error', value: 'error' },
];

@Component({
  selector: 'app-settings-app-config',
  templateUrl: 'settings-app-config.page.html',
  styleUrl: 'settings-app-config.page.scss',
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
    UiSelectComponent,
  ],
})
export class SettingsAppConfigPage implements OnInit {
  private readonly api = inject(Api);
  private readonly topbar = inject(TopbarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly t = inject(TranslateService);

  readonly isLoading = signal(true);
  readonly saveError = signal('');
  readonly saveSuccess = signal('');
  readonly isSaving = signal(false);

  readonly form = this.fb.nonNullable.group({
    logLevel: ['info'],
  });

  readonly logLevelOptions = LOG_LEVEL_OPTIONS;

  async ngOnInit(): Promise<void> {
    this.topbar.set('settings.tabs.app_config');
    this.destroyRef.onDestroy(() => this.topbar.clear());
    try {
      const res = await this.api.invoke(getSystemSettings, {});
      const data = (res as unknown as { data?: typeof res }).data ?? res;
      this.form.patchValue({
        logLevel: data.logLevel ?? 'info',
      });
    } catch {
      this.saveError.set(this.t.instant('settings.system.msg_load_failed'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSave(): Promise<void> {
    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');
    try {
      const vals = this.form.getRawValue();
      const body: SystemSettings = {
        logLevel: vals.logLevel as SystemSettings['logLevel'],
      };
      await this.api.invoke(updateSystemSettings, { body });
      this.saveSuccess.set(this.t.instant('settings.system.msg_admin_updated'));
      this.form.markAsPristine();
    } catch (err) {
      this.saveError.set(
        err instanceof Error ? err.message : 'Failed to update organization settings',
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
