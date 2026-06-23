import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, copyOutline, checkmarkOutline, trashOutline } from 'ionicons/icons';
import { TopbarService } from '@ng/shell/topbar.service';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
  DataTableComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
  UiInputComponent,
  UiSearchFieldComponent,
} from '@ng/shared/ui';
import type { ColumnDef } from '@ng/shared/ui';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';

addIcons({ addOutline, closeOutline, copyOutline, checkmarkOutline, trashOutline });

interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  expiresAt: string | null;
  createdAt: string;
  isActive: boolean;
  lastUsedAt: string | null;
}

interface CreatedKey {
  id: string;
  name: string;
  key: string;
  expiresAt: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-settings-api-keys',
  templateUrl: 'settings-api-keys.page.html',
  styleUrls: ['settings-api-keys.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonButtons,
    IonHeader,
    IonIcon,
    IonModal,
    IonSpinner,
    IonTitle,
    IonToolbar,
    DataTableComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    UiInputComponent,
    UiSearchFieldComponent,
  ],
})
export class SettingsApiKeysPage implements OnInit, AfterViewInit {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfiguration);
  private readonly topbar = inject(TopbarService);
  private readonly destroy = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly keys = signal<ApiKey[]>([]);
  readonly listError = signal('');

  readonly nameCtrl = new FormControl('', { nonNullable: true });
  readonly isCreating = signal(false);
  readonly createError = signal('');
  readonly justCreated = signal<CreatedKey | null>(null);
  readonly copiedKey = signal(false);
  readonly showCreateModal = signal(false);

  readonly deletingId = signal<string | null>(null);
  readonly deleteError = signal('');

  readonly searchQuery = signal('');

  readonly canCreate = computed(() => this.nameCtrl.value.trim().length > 0 && !this.isCreating());

  readonly cols = signal<ColumnDef<ApiKey>[]>([]);

  @ViewChild('maskedKeyCell') private maskedKeyCellTpl!: TemplateRef<{ $implicit: ApiKey }>;
  @ViewChild('statusCell')    private statusCellTpl!: TemplateRef<{ $implicit: ApiKey }>;
  @ViewChild('actionsCell')   private actionsCellTpl!: TemplateRef<{ $implicit: ApiKey }>;

  readonly filteredKeys = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.keys();
    return this.keys().filter(k => k.name.toLowerCase().includes(q));
  });

  private get baseUrl(): string {
    return this.apiConfig.rootUrl;
  }

  ngOnInit(): void {
    this.topbar.set('settings.tabs.api_keys', { icon: 'add-outline', handler: () => this.openCreateModal() });
    this.destroy.onDestroy(() => this.topbar.clear());
    void this.loadKeys();
  }

  ngAfterViewInit(): void {
    this.cols.set([
      { key: 'name',       label: 'fields.name',      sortable: true },
      { key: 'maskedKey',  label: 'fields.key',       cellTemplate: this.maskedKeyCellTpl },
      { key: 'createdAt',  label: 'fields.created',   sortable: true },
      { key: 'lastUsedAt', label: 'fields.last_used' },
      { key: 'isActive',   label: 'fields.status',    cellTemplate: this.statusCellTpl },
      { key: 'actions',    label: '',                 cellTemplate: this.actionsCellTpl },
    ]);
  }

  async loadKeys(): Promise<void> {
    this.isLoading.set(true);
    this.listError.set('');
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: ApiKey[] }>(`${this.baseUrl}/auth/api-keys`)
      );
      this.keys.set(res.data ?? []);
    } catch (err) {
      this.listError.set(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateModal(): void {
    this.nameCtrl.reset('');
    this.createError.set('');
    this.showCreateModal.set(true);
  }

  onModalDismiss(): void {
    this.showCreateModal.set(false);
  }

  async onCreate(): Promise<void> {
    const name = this.nameCtrl.value.trim();
    if (!name) return;
    this.isCreating.set(true);
    this.createError.set('');
    this.justCreated.set(null);
    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean; data: { message: string; apiKey: CreatedKey } }>(
          `${this.baseUrl}/auth/api-keys`,
          { name }
        )
      );
      this.justCreated.set(res.data.apiKey);
      this.showCreateModal.set(false);
      await this.loadKeys();
    } catch (err) {
      this.createError.set(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      this.isCreating.set(false);
    }
  }

  async onDelete(id: string): Promise<void> {
    this.deletingId.set(id);
    this.deleteError.set('');
    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/auth/api-keys`, { params: { id } })
      );
      this.keys.update((ks) => ks.filter((k) => k.id !== id));
      if (this.justCreated()?.id === id) {
        this.justCreated.set(null);
      }
    } catch (err) {
      this.deleteError.set(err instanceof Error ? err.message : 'Failed to delete API key');
    } finally {
      this.deletingId.set(null);
    }
  }

  async copyKey(key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(key);
      this.copiedKey.set(true);
      setTimeout(() => this.copiedKey.set(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  dismissCreated(): void {
    this.justCreated.set(null);
  }
}
