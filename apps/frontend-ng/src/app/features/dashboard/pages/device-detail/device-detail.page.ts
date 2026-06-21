import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import {
  refreshOutline,
  terminalOutline,
  wifiOutline,
  copyOutline,
  hardwareChipOutline,
  flashOutline,
  globeOutline,
  locationOutline,
  timeOutline,
  cubeOutline,
} from 'ionicons/icons';
import {
  IonButton,
  IonIcon,
  IonSkeletonText,
  StatusBadgeComponent,
  EmptyStateComponent,
} from '@ng/shared/ui';
import type { ClaimResult } from '@ng/core/api/generated/models/claim-result';
import type { Device } from '@ng/core/api/generated/models/device';
import { SocketService } from '@ng/core/realtime/socket.service';
import { DeviceDetailService } from '../../services/device-detail.service';
import { DeviceTabNavComponent } from '../../components/device-tab-nav/device-tab-nav.component';
import { CommandSheetComponent } from '../../components/command-sheet/command-sheet.component';
import { hasSSH, isSensorDevice } from '../../device-capabilities';

addIcons({ refreshOutline, terminalOutline, wifiOutline, copyOutline, hardwareChipOutline, flashOutline, globeOutline, locationOutline, timeOutline, cubeOutline });

type DeviceExtended = Device & {
  pendingSetup?: { claimingToken?: string; expiresAt?: string; isExpired?: boolean };
};

@Component({
  selector: 'app-device-detail',
  templateUrl: 'device-detail.page.html',
  styleUrls: ['device-detail.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterOutlet,
    IonButton,
    IonIcon,
    IonSkeletonText,
    StatusBadgeComponent,
    EmptyStateComponent,
    DeviceTabNavComponent,
    CommandSheetComponent,
  ],
})
export class DeviceDetailPage implements OnInit {
  protected readonly route = inject(ActivatedRoute);
  readonly svc = inject(DeviceDetailService);
  private readonly socketService = inject(SocketService);
  private readonly commandSheet = viewChild(CommandSheetComponent);

  readonly deviceId = signal('');
  readonly device = this.svc.device;
  readonly regenerating = signal(false);
  readonly claimResult = signal<ClaimResult | null>(null);

  readonly isPendingSetup = computed(
    () => this.device.data()?.status === 'UNCLAIMED',
  );

  readonly canSSH  = computed(() => hasSSH(this.device.data()?.deviceType));
  readonly isSensor = computed(() => isSensorDevice(this.device.data()?.deviceType));

  readonly token = computed(() => {
    const result = this.claimResult();
    if (result?.claimingToken) return result.claimingToken;
    const d = this.device.data() as DeviceExtended | null;
    return d?.pendingSetup?.claimingToken ?? null;
  });

  readonly openAlertCount = computed(() => {
    const alerts = this.svc.deviceAlerts.data();
    if (!alerts) return 0;
    return alerts.filter((a) => !a.acknowledgedAt && !a.resolvedAt).length;
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);

    this.socketService
      .on<{ deviceId: string }>('device:update')
      .pipe(takeUntilDestroyed())
      .subscribe((ev) => {
        if (ev.deviceId === this.deviceId()) {
          void this.svc.device.reload();
        }
      });
  }

  ngOnInit(): void {
    void this.svc.device.load({ id: this.deviceId() });
  }

  async onRegenerateToken(): Promise<void> {
    const d = this.device.data();
    if (!d?.id) return;
    this.regenerating.set(true);
    try {
      const result = await this.svc.regenerateToken(d.id, d.hostname ?? '');
      this.claimResult.set(result);
    } finally {
      this.regenerating.set(false);
    }
  }

  async onCopyToken(): Promise<void> {
    const t = this.token();
    if (t) await navigator.clipboard.writeText(t);
  }

  onRetry(): void {
    void this.svc.device.load({ id: this.deviceId() });
  }

  onRefresh(): void {
    void this.svc.device.reload();
  }

  onRunCommand(): void {
    this.commandSheet()?.openForIssue();
  }

  formatLastSeen(ts: string | null | undefined): string {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
}
