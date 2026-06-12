import { Component, input, output, computed, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { IonModal, IonHeader, IonContent } from '@ionic/angular/standalone';

/**
 * Bottom sheet — the prototype's signature selector shell over `ion-modal`.
 * Opened imperatively via `open()` (call it from the field/chip click): that
 * runs `present()`, which honors `initialBreakpoint` reliably — unlike the
 * `[isOpen]` input (opens full on first present) and unlike `[trigger]`, whose
 * getElementById listener races dynamic ids and often never attaches. Breakpoints
 * are `[0, 0.92]` (no full-screen rest point) so the sheet always settles at 0.92
 * — it can't be stretched taller, only flicked down to dismiss. Actions live in
 * the header bar (iOS style: Cancel left, Apply right), always visible. Body is
 * projected. Emits `willOpen` (sync draft), `save`, `dismiss`.
 */
@Component({
  selector: 'ui-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonModal, IonHeader, IonContent],
  template: `
    <ion-modal #modalEl class="ui-sheet"
      [breakpoints]="[0, 0.92]"
      [initialBreakpoint]="0.92"
      [handle]="true"
      (ionModalWillPresent)="willOpen.emit()"
      (ionModalDidDismiss)="dismiss.emit()">
      <ng-template>
        <ion-header class="sheet__header">
          <div class="sheet__bar">
            <button type="button" class="sheet__act" (click)="modalEl.dismiss()">Cancel</button>
            <div class="sheet__titles">
              <div class="sheet__title">{{ title() }}</div>
              @if (subline()) {
                <div class="sheet__sub">{{ subline() }}</div>
              }
            </div>
            <button type="button" class="sheet__act sheet__act--save"
              [disabled]="saveDisabled()" (click)="save.emit(); modalEl.dismiss()">
              {{ saveLabel() }}
            </button>
          </div>
        </ion-header>

        <ion-content class="sheet__content">
          <div class="sheet__body">
            <ng-content></ng-content>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styleUrl: './bottom-sheet.component.scss',
})
export class BottomSheetComponent {
  private readonly modal = viewChild.required(IonModal);

  readonly title = input('');
  readonly sub = input('');
  readonly saveLabel = input('Apply');
  readonly saveDisabled = input(false);
  /** Selected count shown under the title; null/undefined falls back to `sub`. */
  readonly count = input<number | null>(null);

  /** Fires just before the sheet opens — sync the draft from the committed value. */
  readonly willOpen = output<void>();
  readonly save = output<void>();
  readonly dismiss = output<void>();

  protected readonly subline = computed(() => {
    const c = this.count();
    return c !== null && c !== undefined ? `${c} selected` : this.sub();
  });

  /** Open the sheet. Uses present() so initialBreakpoint (0.92) is honored. */
  open(): void {
    void this.modal().present();
  }
}
