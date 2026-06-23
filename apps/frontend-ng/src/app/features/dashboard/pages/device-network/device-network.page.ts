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
import { TopbarService } from '@ng/shell/topbar.service';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { refreshOutline, wifiOutline, globeOutline } from 'ionicons/icons';
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
  StatusBadgeComponent,
} from '@ng/shared/ui';
import type { Device } from '@ng/core/api/generated/models/device';
import { DeviceDetailService } from '../../services/device-detail.service';

addIcons({ refreshOutline, wifiOutline, globeOutline });

type DeviceWithNetwork = Device & {
  architecture?: string | null;
  connectionQuality?: 'good' | 'fair' | 'poor' | 'disconnected' | null;
};

@Component({
  selector: 'app-device-network',
  templateUrl: 'device-network.page.html',
  styleUrls: ['device-network.page.scss'],
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
    StatusBadgeComponent,
    TranslatePipe,
  ],
})
export class DeviceNetworkPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly topbar = inject(TopbarService);
  protected readonly svc = inject(DeviceDetailService);

  private readonly deviceId = signal('');
  protected readonly autoRefresh = signal(false);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly device = this.svc.device;

  protected readonly net = computed(() => this.device.data() as DeviceWithNetwork | null);

  protected readonly connectionQualityStatus = computed(() => {
    const q = this.net()?.connectionQuality;
    if (!q || q === 'disconnected') return 'OFFLINE';
    if (q === 'good') return 'ONLINE';
    if (q === 'fair') return 'MAINTENANCE';
    return 'ERROR';
  });

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);
  }

  ngOnInit(): void {
    this.topbar.set('device_network.title');
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

  formatLastSeen(ts: string | null | undefined): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  }

  private clearTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
