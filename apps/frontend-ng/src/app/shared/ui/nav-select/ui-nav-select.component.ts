import {
  ChangeDetectionStrategy, Component, ElementRef,
  computed, inject, input, output, signal,
} from '@angular/core';
import { addIcons } from 'ionicons';
import { chevronDownOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

addIcons({ chevronDownOutline });

export interface NavSelectItem {
  /** Route path or opaque string key emitted on selection. */
  value: string;
  /** i18n key or plain display string. */
  label: string;
  /** Optional numeric badge shown on the trigger and in the dropdown. */
  badge?: number;
}

@Component({
  selector: 'ui-nav-select',
  templateUrl: 'ui-nav-select.component.html',
  styleUrls: ['ui-nav-select.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()',
  },
  imports: [IonIcon, TranslatePipe],
})
export class UiNavSelectComponent {
  readonly items    = input<NavSelectItem[]>([]);
  readonly value    = input<string>('');
  readonly valueChange = output<string>();

  private readonly el = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);

  readonly activeItem = computed(
    () => this.items().find(i => i.value === this.value()) ?? this.items()[0] ?? null,
  );

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update(o => !o);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected select(item: NavSelectItem, event: MouseEvent): void {
    event.stopPropagation();
    this.valueChange.emit(item.value);
    this.close();
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
