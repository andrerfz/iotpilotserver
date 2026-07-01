import {
  ChangeDetectionStrategy, Component, ElementRef,
  inject, input, signal, viewChild,
} from '@angular/core';
import { addIcons } from 'ionicons';
import { ellipsisHorizontal } from 'ionicons/icons';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { ViewportService } from '@ng/core/layout/viewport.service';
import { BottomSheetComponent } from '../sheets/bottom-sheet.component';

addIcons({ ellipsisHorizontal });

export interface UiAction {
  /** i18n key or plain label. */
  label: string;
  /** Ionic icon name. Optional. */
  icon?: string;
  /** 'danger' renders red / destructive styling. */
  role?: 'default' | 'danger';
  handler: () => void;
}

@Component({
  selector: 'ui-actions-menu',
  templateUrl: 'ui-actions-menu.component.html',
  styleUrls: ['ui-actions-menu.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeDropdown()',
  },
  imports: [IonIcon, TranslatePipe, BottomSheetComponent],
})
export class UiActionsMenuComponent {
  readonly primary  = input<UiAction | null>(null);
  readonly actions  = input<UiAction[]>([]);

  private readonly el       = inject(ElementRef<HTMLElement>);
  private readonly viewport = inject(ViewportService);

  private readonly mobileSheet = viewChild<BottomSheetComponent>('mobileSheet');

  protected readonly dropdownOpen = signal(false);

  protected onPrimaryClick(event: MouseEvent): void {
    event.stopPropagation();
    this.primary()?.handler();
  }

  protected toggleActions(event: MouseEvent): void {
    event.stopPropagation();
    if (this.viewport.wide()) {
      this.dropdownOpen.update(o => !o);
    } else {
      this.mobileSheet()?.open();
    }
  }

  protected closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  protected runAction(action: UiAction, event: MouseEvent): void {
    event.stopPropagation();
    action.handler();
    this.closeDropdown();
  }

  protected runSheetAction(action: UiAction): void {
    this.mobileSheet()?.close();
    action.handler();
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }
}
