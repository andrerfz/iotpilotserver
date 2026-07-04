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
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ng/shared/ui';
import { Api } from '@ng/core/api/generated/api';
import { TopbarService } from '@ng/shell/topbar.service';
import { ThemeService, type Theme } from '@ng/shared/ui/theme/theme.service';
import { getSystemSettings } from '@ng/core/api/generated/fn/settings/get-system-settings';
import { updateSystemSettings } from '@ng/core/api/generated/fn/settings/update-system-settings';
import type { SystemSettings } from '@ng/core/api/generated/models/system-settings';

@Component({
  selector: 'app-settings-preferences',
  templateUrl: 'settings-preferences.page.html',
  styleUrls: ['settings-preferences.page.scss'],
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
    IonLabel,
    IonSegment,
    IonSegmentButton,
  ],
})
export class SettingsPreferencesPage implements OnInit {
  private readonly api = inject(Api);
  private readonly topbar = inject(TopbarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);
  private readonly t = inject(TranslateService);

  readonly isLoading = signal(true);
  readonly saveError = signal('');
  readonly saveSuccess = signal('');
  readonly isSaving = signal(false);

  // No controls of its own — exists purely to track dirty/pristine for the
  // Save button, flipped by onThemeChange() below.
  readonly form = this.fb.nonNullable.group({});

  readonly currentTheme = this.themeService.theme;

  private _ready = false;

  async ngOnInit(): Promise<void> {
    this.topbar.set('settings.tabs.preferences');
    this.destroyRef.onDestroy(() => this.topbar.clear());
    try {
      const res = await this.api.invoke(getSystemSettings, {});
      const data = (res as unknown as { data?: typeof res }).data ?? res;
      // Apply the theme persisted server-side so it follows the user across devices.
      if (data.theme) {
        this.themeService.setTheme(data.theme as Theme);
      }
    } catch {
      this.saveError.set(this.t.instant('settings.system.msg_load_failed'));
    } finally {
      this.isLoading.set(false);
    }
    await Promise.resolve();
    this._ready = true;
  }

  onThemeChange(event: Event): void {
    if (!this._ready) return;
    const value = (event as CustomEvent<{ value: string }>).detail?.value as Theme;
    if (value) {
      this.themeService.setTheme(value);
      this.form.markAsDirty();
    }
  }

  async onSave(): Promise<void> {
    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');
    try {
      const body: SystemSettings = {
        theme: this.currentTheme(),
      };
      await this.api.invoke(updateSystemSettings, { body });
      this.saveSuccess.set(this.t.instant('settings.system.msg_display_updated'));
      this.form.markAsPristine();
    } catch (err) {
      this.saveError.set(
        err instanceof Error ? err.message : 'Failed to update preferences',
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
