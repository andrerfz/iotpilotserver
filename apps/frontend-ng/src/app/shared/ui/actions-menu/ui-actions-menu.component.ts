import {
  ChangeDetectionStrategy, Component, ElementRef,
  inject, input, signal,
} from '@angular/core';
import { addIcons } from 'ionicons';
import { ellipsisHorizontal } from 'ionicons/icons';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import type { TopbarAction } from '../../../shell/topbar.service';

addIcons({ ellipsisHorizontal });

@Component({
  selector: 'ui-actions-menu',
  templateUrl: 'ui-actions-menu.component.html',
  styleUrls: ['ui-actions-menu.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeOverflow()',
  },
  imports: [IonIcon, TranslatePipe],
})
export class UiActionsMenuComponent {
  readonly primary  = input<TopbarAction | null>(null);
  readonly overflow = input<TopbarAction[]>([]);

  private readonly el = inject(ElementRef<HTMLElement>);

  protected readonly overflowOpen = signal(false);

  protected onPrimaryClick(event: MouseEvent): void {
    event.stopPropagation();
    this.primary()?.handler();
  }

  protected toggleOverflow(event: MouseEvent): void {
    event.stopPropagation();
    this.overflowOpen.update(o => !o);
  }

  protected closeOverflow(): void {
    this.overflowOpen.set(false);
  }

  protected runOverflow(action: TopbarAction, event: MouseEvent): void {
    event.stopPropagation();
    action.handler();
    this.closeOverflow();
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.closeOverflow();
    }
  }
}
