import {
  Component, ElementRef, inject, input, output, computed, viewChild, ChangeDetectionStrategy,
} from '@angular/core';
import { IonModal, IonHeader, IonContent } from '@ionic/angular/standalone';

/**
 * Bottom sheet — the prototype's signature selector shell over `ion-modal`.
 * Opened imperatively via `open()` (call it from the field/chip click): that
 * runs `present()`, which honors the breakpoint reliably — unlike the `[isOpen]`
 * input (opens full on first present) and unlike `[trigger]`, whose getElementById
 * listener races dynamic ids and often never attaches.
 *
 * Two presentations (input `presentation`):
 *  - `'sheet'` (default): a true bottom sheet — breakpoints `[0, 0.92]` (no
 *    full-screen rest point, so it settles at 0.92 and can't be stretched, only
 *    flicked down to dismiss) with a drag handle.
 *  - `'card'`: an iOS card modal (`mode="ios"` + `presentingElement`) — the view
 *    behind recedes/scales back, and nested cards cascade (each sits inset and
 *    lower than the one behind). `presentingElement` is wired in `open()`: the
 *    sheet passed via `[over]` (→ cascade over that card), else the nearest
 *    ancestor `ion-modal`, else the app's `ion-router-outlet`. To cascade, point a
 *    card sheet at its parent: `<ui-bottom-sheet presentation="card" [over]="parent">`.
 *
 * Actions live in the header bar (iOS style: Cancel left, Apply right), always
 * visible. Body is projected. Emits `willOpen` (sync draft), `save`, `dismiss`.
 */
@Component({
  selector: 'ui-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonModal, IonHeader, IonContent],
  template: `
    <ion-modal #modalEl class="ui-sheet" [class.ui-sheet--card]="isCard()"
      [mode]="isCard() ? 'ios' : undefined"
      [breakpoints]="isCard() ? undefined : [0, 0.92]"
      [initialBreakpoint]="isCard() ? undefined : 0.92"
      [handle]="!isCard()"
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
  private readonly modalElRef = viewChild.required('modalEl', { read: ElementRef });
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly title = input('');
  readonly sub = input('');
  readonly saveLabel = input('Apply');
  readonly saveDisabled = input(false);
  /** Selected count shown under the title; null/undefined falls back to `sub`. */
  readonly count = input<number | null>(null);
  /** `'sheet'` (bottom sheet, default) or `'card'` (iOS card modal that cascades when nested). */
  readonly presentation = input<'sheet' | 'card'>('sheet');
  /** Parent card sheet to cascade over (card presentation only). */
  readonly over = input<BottomSheetComponent | null>(null);

  /** This sheet's <ion-modal> host element — used as a parent's presentingElement. */
  get modalElement(): HTMLElement {
    return this.modalElRef().nativeElement as HTMLElement;
  }

  /** Fires just before the sheet opens — sync the draft from the committed value. */
  readonly willOpen = output<void>();
  readonly save = output<void>();
  readonly dismiss = output<void>();

  protected readonly isCard = computed(() => this.presentation() === 'card');

  protected readonly subline = computed(() => {
    const c = this.count();
    return c !== null && c !== undefined ? `${c} selected` : this.sub();
  });

  close(): void {
    void this.modal().dismiss();
  }

  /**
   * Open the sheet. Uses present() so the breakpoint is honored. For card
   * presentation, wires presentingElement so the view behind recedes — the
   * nearest ancestor modal (cascade when nested) or the router outlet.
   */
  open(): void {
    const modal = this.modal();
    if (this.isCard()) {
      const host = this.hostEl.nativeElement;
      modal.presentingElement =
        this.over()?.modalElement ??
        (host.closest('ion-modal') as HTMLElement | null) ??
        (document.querySelector('ion-router-outlet') as HTMLElement | null) ??
        undefined;
    }
    void modal.present();
  }
}
