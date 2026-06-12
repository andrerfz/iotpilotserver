import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IonContent, IonButton, IonIcon, BottomSheetComponent } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import { checkmark } from 'ionicons/icons';

addIcons({ checkmark });

/**
 * POC (dev-only, /__cascade) for the iOS "card stack" cascade using the KIT's
 * ui-bottom-sheet with `presentation="card"`.
 *
 * The nested sheet is declared INSIDE the outer sheet's projected content, so when
 * the outer presents and Ionic relocates that content into its overlay, the nested
 * sheet's host sits inside the outer ion-modal. open() then auto-wires
 * presentingElement to that ancestor modal → the outer recedes and the inner sits
 * inset/lower (cascade). No manual presentingElement wiring in the page.
 */
@Component({
  selector: 'app-cascade-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, IonIcon, BottomSheetComponent],
  template: `
    <ion-content class="cascade-demo ion-padding">
      <h1>Cascade POC — nested card modals (kit ui-bottom-sheet, presentation="card")</h1>
      <p>
        Open the first card, then "Open nested" — the first recedes/scales back and the
        second sits inset and lower. The effect is most visible on a mobile viewport
        (device toolbar → iPhone).
      </p>
      <ion-button (click)="outer.open()">Open first card modal</ion-button>

      <ui-bottom-sheet #outer presentation="card" title="First modal" saveLabel="Done">
        <p>This is the first card modal. The page behind it has receded.</p>
        <ion-button (click)="inner.open()">Open nested modal</ion-button>
      </ui-bottom-sheet>

      <!-- Sibling sheet pointed at the outer via [over] so it cascades over it. -->
      <ui-bottom-sheet #inner presentation="card" [over]="outer" title="Status" saveLabel="Apply">
        <div class="optlist">
          @for (opt of options; track opt) {
            <div class="opt" [class.opt--sel]="picked === opt"
              role="button" tabindex="0"
              (click)="picked = opt" (keydown.enter)="picked = opt">
              <div class="opt__title">{{ opt }}</div>
              <div class="opt__check"><ion-icon name="checkmark"></ion-icon></div>
            </div>
          }
        </div>
      </ui-bottom-sheet>
    </ion-content>
  `,
  styles: [`
    h1 { font-size: 18px; }
    .optlist { display: flex; flex-direction: column; gap: 3px; }
    .opt { display: flex; align-items: center; gap: 11px; padding: 9px 10px;
      border-radius: var(--r-sm); cursor: pointer; border: 1px solid transparent; }
    .opt:hover { background: var(--surface-2); }
    .opt--sel { background: var(--primary-weak); border-color: var(--primary-line); }
    .opt__title { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 500; }
    .opt__check { width: 19px; height: 19px; border-radius: 6px; border: 1.5px solid var(--border-strong);
      display: grid; place-items: center; flex: none; }
    .opt__check ion-icon { width: 12px; height: 12px; color: var(--primary-ink); opacity: 0; }
    .opt--sel .opt__check { background: var(--primary); border-color: var(--primary); }
    .opt--sel .opt__check ion-icon { opacity: 1; }
  `],
})
export class CascadeDemoPage {
  protected readonly options = ['Online', 'Offline', 'Maintenance'];
  protected picked = '';
}
