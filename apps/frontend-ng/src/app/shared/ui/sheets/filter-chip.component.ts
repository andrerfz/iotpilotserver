import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDown, close } from 'ionicons/icons';

addIcons({ chevronDown, close });

/**
 * Filter chip — ports the prototype `FilterChip`. Leading icon is projected via
 * the `[icon]` slot (consumer supplies a registered <ion-icon>). Shows label,
 * optional active value, optional count badge, and a clear 'x' when active
 * (chevron-down otherwise).
 */
@Component({
  selector: 'ui-filter-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  template: `
    <button class="chip" [class.chip--active]="active()" (click)="chipClick.emit()">
      <ng-content select="[icon]"></ng-content>
      <span class="chip__key">{{ label() }}</span>
      @if (value()) {
        <span class="chip__val">{{ value() }}</span>
      }
      @if (count() > 0) {
        <span class="chip__count">{{ count() }}</span>
      }
      @if (active()) {
        <span class="chip__x" role="button" tabindex="0"
          aria-label="Clear filter"
          (click)="$event.stopPropagation(); clear.emit()"
          (keydown.enter)="$event.stopPropagation(); clear.emit()"
          (keydown.space)="$event.stopPropagation(); clear.emit()">
          <ion-icon name="close"></ion-icon>
        </span>
      } @else {
        <ion-icon class="chip__chev" name="chevron-down"></ion-icon>
      }
    </button>
  `,
  styleUrl: './filter-chip.component.scss',
})
export class FilterChipComponent {
  readonly label = input.required<string>();
  readonly value = input('');
  readonly active = input(false);
  readonly count = input(0);

  readonly chipClick = output<void>();
  readonly clear = output<void>();
}
