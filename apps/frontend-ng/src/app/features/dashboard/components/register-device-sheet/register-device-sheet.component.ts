import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { addIcons } from 'ionicons';
import { copyOutline, checkmarkOutline, qrCodeOutline } from 'ionicons/icons';

import {
  BottomSheetComponent,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  IonText,
} from '@ng/shared/ui';
import type { ClaimResult } from '@ng/core/api/generated/models/claim-result';
import { DashboardService } from '../../services/dashboard.service';

addIcons({ copyOutline, checkmarkOutline, qrCodeOutline });

@Component({
  selector: 'app-register-device-sheet',
  templateUrl: 'register-device-sheet.component.html',
  styleUrls: ['register-device-sheet.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BottomSheetComponent,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    IonText,
  ],
})
export class RegisterDeviceSheetComponent {
  private readonly dashService = inject(DashboardService);

  protected readonly sheetRef = viewChild.required(BottomSheetComponent);

  protected readonly step = signal<'form' | 'success'>('form');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly claimResult = signal<ClaimResult | null>(null);
  protected readonly copied = signal(false);

  readonly deviceId = signal('');
  readonly deviceName = signal('');

  readonly minutesLeft = computed(() => {
    const exp = this.claimResult()?.expiresAt;
    if (!exp) return 0;
    return Math.max(0, Math.round((new Date(exp).getTime() - Date.now()) / 60_000));
  });

  readonly deviceClaimed = output<ClaimResult>();

  open(): void {
    this.reset();
    this.sheetRef().open();
  }

  async onClaim(): Promise<void> {
    const id = this.deviceId().trim().toUpperCase();
    if (!id) {
      this.error.set('Device ID is required');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.dashService.claimDevice(id, this.deviceName().trim() || undefined);
      this.claimResult.set(result);
      this.step.set('success');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to claim device');
    } finally {
      this.loading.set(false);
    }
  }

  onSheetDismiss(): void {
    const r = this.claimResult();
    if (r) this.deviceClaimed.emit(r);
    this.reset();
  }

  async copyToken(): Promise<void> {
    const token = this.claimResult()?.claimingToken;
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard API unavailable in non-secure context
    }
  }

  private reset(): void {
    this.step.set('form');
    this.error.set(null);
    this.claimResult.set(null);
    this.copied.set(false);
    this.deviceId.set('');
    this.deviceName.set('');
    this.loading.set(false);
  }
}
