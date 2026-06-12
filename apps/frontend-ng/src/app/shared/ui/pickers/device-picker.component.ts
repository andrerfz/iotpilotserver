import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { addIcons } from 'ionicons';
import { hardwareChipOutline } from 'ionicons/icons';
import { MultiSelectPickerComponent, PickerOption } from './multi-select-picker.component';

addIcons({ hardwareChipOutline });

export interface DevicePickerItem {
  id: string;
  name: string;
  status: string;
  location?: string;
}

/**
 * Thin specialization of MultiSelectPicker for devices (status dot + name +
 * "id · location"). Items are supplied via `devices` — wire to fe-core's
 * listDevices at the container/page level.
 */
@Component({
  selector: 'ui-device-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MultiSelectPickerComponent],
  template: `
    <ui-multi-select-picker
      [label]="label()"
      title="Select device"
      [sub]="multi() ? 'Choose one or more devices' : 'Choose a device'"
      chipIcon="hardware-chip-outline"
      [options]="options()"
      [value]="value()"
      [multi]="multi()"
      [searchable]="true"
      searchPlaceholder="Search by name, ID or location…"
      (valueChange)="valueChange.emit($event)">
    </ui-multi-select-picker>
  `,
})
export class DevicePickerComponent {
  readonly devices = input<DevicePickerItem[]>([]);
  readonly value = input<string[]>([]);
  readonly multi = input(true);
  readonly label = input('Device');

  readonly valueChange = output<string[]>();

  protected readonly options = computed<PickerOption<string>[]>(() =>
    this.devices().map(d => ({
      value: d.id,
      label: d.name,
      dot: d.status,
      meta: [d.id, d.location].filter(Boolean).join(' · '),
    })),
  );
}
