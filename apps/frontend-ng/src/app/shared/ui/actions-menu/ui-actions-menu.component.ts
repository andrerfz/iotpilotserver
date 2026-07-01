import {
  ChangeDetectionStrategy, Component, ElementRef,
  inject, input, signal,
} from '@angular/core';
import { addIcons } from 'ionicons';
import { ellipsisHorizontal } from 'ionicons/icons';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActionSheetController } from '@ionic/angular/standalone';
import { ViewportService } from '@ng/core/layout/viewport.service';

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
  imports: [IonIcon, TranslatePipe],
})
export class UiActionsMenuComponent {
  readonly primary  = input<UiAction | null>(null);
  readonly actions  = input<UiAction[]>([]);

  private readonly el          = inject(ElementRef<HTMLElement>);
  private readonly sheetCtrl   = inject(ActionSheetController);
  private readonly viewport    = inject(ViewportService);
  private readonly t           = inject(TranslateService);

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
      void this.openSheet();
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

  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  private async openSheet(): Promise<void> {
    const sheet = await this.sheetCtrl.create({
      buttons: this.actions().map((a) => ({
        text: this.t.instant(a.label),
        role: a.role === 'danger' ? 'destructive' : undefined,
        icon: a.icon,
        handler: a.handler,
      })),
    });
    await sheet.present();
  }
}
