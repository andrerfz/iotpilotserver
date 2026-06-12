import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { IonModal, IonHeader, IonContent } from '@ionic/angular/standalone';

/**
 * Bottom sheet — the prototype's signature selector shell over `ion-modal` with
 * breakpoints. Actions live in the header bar (iOS-style: Cancel left, Apply
 * right) so they're always visible regardless of breakpoint. Body is projected.
 * The parent owns `open`; `dismiss`/`save` report user intent.
 */
@Component({
  selector: 'ui-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonModal, IonHeader, IonContent],
  template: `
    <ion-modal
      #modalEl
      class="ui-sheet"
      [isOpen]="open()"
      [breakpoints]="breakpoints()"
      [initialBreakpoint]="initialBreakpoint()"
      [handle]="true"
      (ionModalDidPresent)="modalEl.setCurrentBreakpoint(initialBreakpoint())"
      (ionModalDidDismiss)="dismiss.emit()">
      <ng-template>
        <ion-header class="sheet__header">
          <div class="sheet__bar">
            <button type="button" class="sheet__act" (click)="dismiss.emit()">Cancel</button>
            <div class="sheet__titles">
              <div class="sheet__title">{{ title() }}</div>
              @if (subline()) {
                <div class="sheet__sub">{{ subline() }}</div>
              }
            </div>
            <button type="button" class="sheet__act sheet__act--save"
              [disabled]="saveDisabled()" (click)="save.emit()">
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
  readonly open = input(false);
  readonly title = input('');
  readonly sub = input('');
  readonly saveLabel = input('Apply');
  readonly saveDisabled = input(false);
  /** Selected count shown under the title; null/undefined falls back to `sub`. */
  readonly count = input<number | null>(null);
  /** Default ~0.92 leaves a header-height gap at the top (iOS look); draggable
   *  up to full or down to dismiss via the breakpoints array. */
  readonly initialBreakpoint = input(0.92);
  readonly breakpoints = input<number[]>([0, 0.92, 1]);

  readonly dismiss = output<void>();
  readonly save = output<void>();

  protected readonly subline = computed(() => {
    const c = this.count();
    return c !== null && c !== undefined ? `${c} selected` : this.sub();
  });
}
