import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { IonModal, IonButton } from '@ionic/angular/standalone';

/**
 * Bottom sheet — the prototype's signature selector shell, built on `ion-modal`
 * with breakpoints (Q-resolved). Header (title/sub + optional count badge),
 * projected body, split footer (Cancel left / Save right with saveDisabled).
 * The parent owns the `open` state; `close`/`save` report user intent.
 */
@Component({
  selector: 'ui-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonModal, IonButton],
  template: `
    <ion-modal
      class="ui-sheet"
      [isOpen]="open()"
      [breakpoints]="[0, 1]"
      [initialBreakpoint]="1"
      [handle]="true"
      (ionModalDidDismiss)="dismiss.emit()">
      <ng-template>
        <div class="sheet__inner">
          <div class="sheet__head">
            <div>
              <div class="sheet__title">{{ title() }}</div>
              @if (sub()) {
                <div class="sheet__sub">{{ sub() }}</div>
              }
            </div>
            @if (count() !== null && count() !== undefined) {
              <span class="label">{{ count() }} selected</span>
            }
          </div>
          <div class="sheet__body">
            <ng-content></ng-content>
          </div>
          <div class="sheet__foot sheet__foot--split">
            <ion-button fill="outline" color="medium" (click)="dismiss.emit()">Cancel</ion-button>
            <ion-button color="primary" [disabled]="saveDisabled()" (click)="save.emit()">
              {{ saveLabel() }}
            </ion-button>
          </div>
        </div>
      </ng-template>
    </ion-modal>
  `,
  styleUrl: './bottom-sheet.component.scss',
})
export class BottomSheetComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly sub = input('');
  readonly saveLabel = input('Apply');
  readonly saveDisabled = input(false);
  /** Selected count badge in the header; null/undefined hides it. */
  readonly count = input<number | null>(null);

  readonly dismiss = output<void>();
  readonly save = output<void>();
}
