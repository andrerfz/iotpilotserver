/* Ported 1:1 from prototype app.css — ".field" (search input in filterbars). */
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';

addIcons({ searchOutline });

@Component({
  selector: 'ui-search-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, TranslatePipe],
  template: `
    <div class="field">
      <ion-icon name="search-outline"></ion-icon>
      <input
        [placeholder]="placeholder() || ('ui.search_placeholder' | translate)"
        [value]="value()"
        (input)="valueChange.emit($any($event.target).value)"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false" />
    </div>
  `,
  styleUrl: './ui-search-field.component.scss',
})
export class UiSearchFieldComponent {
  readonly placeholder = input('');
  readonly value = input('');
  readonly valueChange = output<string>();
}
