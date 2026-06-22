import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { personOutline } from 'ionicons/icons';
import { MultiSelectPickerComponent, PickerOption } from './multi-select-picker.component';

addIcons({ personOutline });

export interface UserPickerItem {
  id: string;
  name: string;
  email: string;
  role?: string;
}

/**
 * Thin specialization of MultiSelectPicker for users (name + "email · role").
 * Items are supplied via `users` — wire to fe-core's listUsers at the
 * container/page level. (Avatar + RoleBadge in-row is deferred; role shown in
 * the meta line.)
 */
@Component({
  selector: 'ui-user-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MultiSelectPickerComponent, TranslatePipe],
  template: `
    <ui-multi-select-picker
      [label]="label()"
      [title]="'ui.user_picker.title' | translate"
      [sub]="(multi() ? 'ui.user_picker.multi' : 'ui.user_picker.single') | translate"
      chipIcon="person-outline"
      [options]="options()"
      [value]="value()"
      [multi]="multi()"
      [searchable]="true"
      [searchPlaceholder]="'ui.user_picker.search_ph' | translate"
      (valueChange)="valueChange.emit($event)">
    </ui-multi-select-picker>
  `,
})
export class UserPickerComponent {
  readonly users = input<UserPickerItem[]>([]);
  readonly value = input<string[]>([]);
  readonly multi = input(true);
  readonly label = input('Assignee');

  readonly valueChange = output<string[]>();

  protected readonly options = computed<PickerOption<string>[]>(() =>
    this.users().map(u => ({
      value: u.id,
      label: u.name,
      meta: [u.email, u.role].filter(Boolean).join(' · '),
    })),
  );
}
