import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { refreshOutline, saveOutline } from 'ionicons/icons';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonSkeletonText,
  IonToggle,
  EmptyStateComponent,
} from '@ng/shared/ui';
import type { Device } from '@ng/core/api/generated/models/device';
import { DeviceDetailService } from '../../services/device-detail.service';

addIcons({ refreshOutline, saveOutline });

type DeviceWithStorage = Device & {
  cpuUsage?: number | null;
  memoryUsage?: number | null;
  memoryTotal?: number | null;
  diskUsage?: number | null;
  diskTotal?: string | null;
  loadAverage?: string | null;
  uptime?: string | null;
};

@Component({
  selector: 'app-device-storage',
  templateUrl: 'device-storage.page.html',
  styleUrls: ['device-storage.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonIcon,
    IonSkeletonText,
    IonToggle,
    EmptyStateComponent,
  ],
})
export class DeviceStoragePage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(DeviceDetailService);

  private readonly deviceId = signal('');
  protected readonly autoRefresh = signal(false);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly device = this.svc.device;
  protected readonly storage = computed(() => this.device.data() as DeviceWithStorage | null);

  protected readonly diskBarWidth = computed(() => {
    const v = this.storage()?.diskUsage;
    return v != null ? Math.min(100, Math.max(0, v)) : 0;
  });

  protected readonly memBarWidth = computed(() => {
    const v = this.storage()?.memoryUsage;
    return v != null ? Math.min(100, Math.max(0, v)) : 0;
  });

  protected readonly cpuBarWidth = computed(() => {
    const v = this.storage()?.cpuUsage;
    return v != null ? Math.min(100, Math.max(0, v)) : 0;
  });

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);
  }

  ngOnInit(): void {
    void this.svc.device.load({ id: this.deviceId() });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  onRefresh(): void {
    void this.svc.device.reload();
  }

  onAutoRefreshToggle(enabled: boolean): void {
    this.autoRefresh.set(enabled);
    if (enabled) {
      this.refreshTimer = setInterval(() => void this.svc.device.reload(), 30_000);
    } else {
      this.clearTimer();
    }
  }

  onRetry(): void {
    void this.svc.device.load({ id: this.deviceId() });
  }

  barColor(pct: number): string {
    if (pct >= 90) return 'var(--danger)';
    if (pct >= 75) return 'var(--warning)';
    return 'var(--success)';
  }

  formatMemory(mb: number | null | undefined): string {
    if (mb == null) return '—';
    return `${(mb / 1024).toFixed(1)} GB`;
  }

  private clearTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
