import {
  ChangeDetectionStrategy, Component, input, output, signal, viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon, BottomSheetComponent } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline, checkmarkDoneOutline, alertCircleOutline,
  hardwareChipOutline, timeOutline,
} from 'ionicons/icons';
import type { Alert } from '@ng/core/api/generated/models/alert';

addIcons({ checkmarkCircleOutline, checkmarkDoneOutline, alertCircleOutline, hardwareChipOutline, timeOutline });

/**
 * Tap-to-open detail for a single alert. Shows the full message (which the data
 * table truncates / hides on mobile) plus metadata and the Acknowledge / Resolve
 * actions. Reused by the monitoring list and the device-detail alerts tab — the
 * parent decides how the action is dispatched (monitoring vs device-scoped).
 */
@Component({
  selector: 'app-alert-detail-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, BottomSheetComponent, TranslatePipe, DatePipe],
  template: `
    <ui-bottom-sheet #sheet [title]="'alerts.detail' | translate" [showSave]="false" [breakpoint]="0.7">
      @let a = alert();
      @if (a) {
        <div class="adsheet">
          <div class="adsheet__head">
            <span class="sev" [class]="'sev--' + (a.severity || 'INFO').toLowerCase()">{{ a.severity }}</span>
            <span class="adsheet__type">{{ a.type }}</span>
          </div>

          <div class="adsheet__title">{{ a.title }}</div>
          <p class="adsheet__msg">{{ a.message }}</p>

          <div class="adsheet__meta">
            @if (a.deviceId) {
              <div class="metarow"><ion-icon name="hardware-chip-outline"></ion-icon><span>{{ a.deviceId }}</span></div>
            }
            <div class="metarow"><ion-icon name="time-outline"></ion-icon><span>{{ 'fields.triggered' | translate }}: {{ a.createdAt | date:'medium' }}</span></div>
            @if (a.acknowledgedAt) {
              <div class="metarow"><ion-icon name="checkmark-done-outline"></ion-icon><span>{{ 'status.acknowledged' | translate }}: {{ a.acknowledgedAt | date:'medium' }}</span></div>
            }
            @if (a.resolvedAt) {
              <div class="metarow"><ion-icon name="checkmark-circle-outline"></ion-icon><span>{{ 'status.resolved' | translate }}: {{ a.resolvedAt | date:'medium' }}</span></div>
            }
          </div>

          @if (!a.resolved) {
            <div class="adsheet__actions">
              @if (!a.acknowledgedAt) {
                <button class="btn btn--ghost" [disabled]="busy()" (click)="acknowledge.emit(a)">
                  <ion-icon name="checkmark-done-outline"></ion-icon>{{ 'alerts.acknowledge' | translate }}
                </button>
              }
              <button class="btn btn--primary" [disabled]="busy()" (click)="resolve.emit(a)">
                <ion-icon name="checkmark-circle-outline"></ion-icon>{{ 'alerts.resolve' | translate }}
              </button>
            </div>
          } @else {
            <div class="adsheet__resolved">{{ 'alerts.already_resolved' | translate }}</div>
          }
        </div>
      }
    </ui-bottom-sheet>
  `,
  styleUrl: './alert-detail-sheet.component.scss',
})
export class AlertDetailSheetComponent {
  /** Disable actions while a request is in flight. */
  readonly busy = input(false);
  readonly acknowledge = output<Alert>();
  readonly resolve = output<Alert>();

  protected readonly alert = signal<Alert | null>(null);
  private readonly sheet = viewChild<BottomSheetComponent>('sheet');

  /** Open the sheet for a given alert. */
  open(a: Alert): void {
    this.alert.set(a);
    this.sheet()?.open();
  }

  close(): void {
    this.sheet()?.close();
  }
}
