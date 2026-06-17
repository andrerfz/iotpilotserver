import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, copyOutline, checkmarkOutline, trashOutline } from 'ionicons/icons';
import { TopbarService } from '@ng/shell/topbar.service';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
} from '@ng/shared/ui';
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
    FormsModule,
    DatePipe,
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
    IonIcon,
    IonInput,
  ],
})
export class SettingsApiKeysPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfiguration);
  private readonly topbar = inject(TopbarService);
  private readonly destroy = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly keys = signal<ApiKey[]>([]);
  readonly listError = signal('');

  readonly newKeyName = signal('');
  readonly isCreating = signal(false);
  readonly createError = signal('');
  readonly justCreated = signal<CreatedKey | null>(null);
  readonly copiedKey = signal(false);

  readonly deletingId = signal<string | null>(null);
  readonly deleteError = signal('');

  readonly canCreate = computed(() => this.newKeyName().trim().length > 0 && !this.isCreating());

  private get baseUrl(): string {
    return this.apiConfig.rootUrl;
  }

  ngOnInit(): void {
    this.topbar.set('API Keys');
    this.destroy.onDestroy(() => this.topbar.clear());
    void this.loadKeys();
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

  async onCreate(): Promise<void> {
    const name = this.newKeyName().trim();
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
      this.newKeyName.set('');
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
