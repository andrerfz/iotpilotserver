import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
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
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonToggle,
} from '@ng/shared/ui';
import { Api } from '@ng/core/api/generated/api';
import { TopbarService } from '@ng/shell/topbar.service';
import { ThemeService, type Theme } from '@ng/shared/ui/theme/theme.service';
import { UiSelectComponent, type SelectOption } from '@ng/shared/ui';
import { getSystemSettings } from '@ng/core/api/generated/fn/settings/get-system-settings';
import { updateSystemSettings } from '@ng/core/api/generated/fn/settings/update-system-settings';
import type { SystemSettings } from '@ng/core/api/generated/models/system-settings';

const DASHBOARD_LAYOUT_OPTIONS: SelectOption[] = [
  { label: 'Default', value: 'default' },
  { label: 'Compact', value: 'compact' },
  { label: 'Expanded', value: 'expanded' },
];

const ITEMS_PER_PAGE_OPTIONS: SelectOption[] = [
  { label: '5', value: '5' },
  { label: '10', value: '10' },
  { label: '25', value: '25' },
  { label: '50', value: '50' },
  { label: '100', value: '100' },
];

const LOG_LEVEL_OPTIONS: SelectOption[] = [
  { label: 'Debug (Verbose)', value: 'debug' },
  { label: 'Info (Standard)', value: 'info' },
  { label: 'Warning (Minimal)', value: 'warn' },
  { label: 'Error (Critical Only)', value: 'error' },
];

@Component({
  selector: 'app-settings-system',
  templateUrl: 'settings-system.page.html',
  styleUrls: ['settings-system.page.scss'],
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
    IonSegment,
    IonSegmentButton,
    IonToggle,
    UiSelectComponent,
  ],
})
export class SettingsSystemPage implements OnInit {
  private readonly api = inject(Api);
  private readonly topbar = inject(TopbarService);
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);

  readonly isLoading = signal(true);
  private readonly systemData = signal<SystemSettings | null>(null);
  readonly isAdmin = computed(() => this.systemData()?.isAdmin === 'true');

  readonly displayForm = this.fb.nonNullable.group({
    dashboardLayout: ['default'],
    itemsPerPage: ['10'],
  });

  readonly adminForm = this.fb.nonNullable.group({
    enableAdvancedMetrics: [false],
    enableBetaFeatures: [false],
    logLevel: ['info'],
  });

  readonly isSavingDisplay = signal(false);
  readonly displayError = signal('');
  readonly displaySuccess = signal('');

  readonly isSavingAdmin = signal(false);
  readonly adminError = signal('');
  readonly adminSuccess = signal('');

  readonly currentTheme = this.themeService.theme;

  readonly dashboardLayoutOptions = DASHBOARD_LAYOUT_OPTIONS;
  readonly itemsPerPageOptions = ITEMS_PER_PAGE_OPTIONS;
  readonly logLevelOptions = LOG_LEVEL_OPTIONS;

  async ngOnInit(): Promise<void> {
    this.topbar.set('System');
    try {
      const res = await this.api.invoke(getSystemSettings, {});
      const data = (res as unknown as { data?: typeof res }).data ?? res;
      this.systemData.set(data);
      this.displayForm.patchValue({
        dashboardLayout: data.dashboardLayout ?? 'default',
        itemsPerPage: data.itemsPerPage ?? '10',
      });
      if (data.isAdmin === 'true') {
        this.adminForm.patchValue({
          enableAdvancedMetrics: data.enableAdvancedMetrics === 'true',
          enableBetaFeatures: data.enableBetaFeatures === 'true',
          logLevel: data.logLevel ?? 'info',
        });
      }
      if (data.theme) {
        this.themeService.setTheme(data.theme as Theme);
      }
    } catch {
      this.displayError.set('Failed to load system settings');
    } finally {
      this.isLoading.set(false);
    }
  }

  onThemeChange(event: Event): void {
    const value = (event as CustomEvent<{ value: string }>).detail?.value as Theme;
    if (value) {
      this.themeService.setTheme(value);
      this.displayForm.markAsDirty();
    }
  }

  async onSaveDisplay(): Promise<void> {
    this.isSavingDisplay.set(true);
    this.displayError.set('');
    this.displaySuccess.set('');
    try {
      const { dashboardLayout, itemsPerPage } = this.displayForm.getRawValue();
      const body: SystemSettings = {
        dashboardLayout: dashboardLayout as SystemSettings['dashboardLayout'],
        itemsPerPage,
      };
      await this.api.invoke(updateSystemSettings, { body });
      this.displaySuccess.set('Display settings updated successfully');
      this.displayForm.markAsPristine();
    } catch (err) {
      this.displayError.set(
        err instanceof Error ? err.message : 'Failed to update display settings',
      );
    } finally {
      this.isSavingDisplay.set(false);
    }
  }

  async onSaveAdmin(): Promise<void> {
    this.isSavingAdmin.set(true);
    this.adminError.set('');
    this.adminSuccess.set('');
    try {
      const vals = this.adminForm.getRawValue();
      const body: SystemSettings = {
        enableAdvancedMetrics: String(vals.enableAdvancedMetrics) as 'true' | 'false',
        enableBetaFeatures: String(vals.enableBetaFeatures) as 'true' | 'false',
        logLevel: vals.logLevel as SystemSettings['logLevel'],
      };
      await this.api.invoke(updateSystemSettings, { body });
      this.adminSuccess.set('Admin settings updated successfully');
      this.adminForm.markAsPristine();
    } catch (err) {
      this.adminError.set(
        err instanceof Error ? err.message : 'Failed to update admin settings',
      );
    } finally {
      this.isSavingAdmin.set(false);
    }
  }
}
