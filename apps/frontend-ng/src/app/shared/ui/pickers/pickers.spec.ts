import { render, fireEvent } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { MultiSelectPickerComponent, PickerOption } from './multi-select-picker.component';
import { DevicePickerComponent } from './device-picker.component';
import { UserPickerComponent } from './user-picker.component';
import { DateRangePickerComponent } from './date-range-picker.component';

// The sheet body (option list) renders inside ion-modal's presented template,
// which jsdom doesn't stamp — so selection behaviour is exercised via the
// component instance, and the committed display via the rendered chip.

/** Test-only views onto the components' protected members. */
interface MultiHarness {
  openSheet(): void;
  toggle(v: string): void;
  save(): void;
  draft(): string[];
  query: { set(v: string): void };
  filtered(): PickerOption[];
}
interface MappedHarness { options(): PickerOption[]; }
interface DateHarness {
  openSheet(): void;
  save(): void;
  draft: { set(v: string): void };
  cells: (number | null)[];
  today: number;
}

const OPTS: PickerOption[] = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

describe('MultiSelectPickerComponent', () => {
  it('chip summary: empty → none, single → label, many → "n selected"', async () => {
    const { container, rerender } = await render(MultiSelectPickerComponent, {
      inputs: { label: 'Status', options: OPTS, value: [] },
    });
    expect(container.querySelector('.chip__val')).toBeFalsy();

    await rerender({ inputs: { label: 'Status', options: OPTS, value: ['ONLINE'] } });
    expect(container.querySelector('.chip__val')?.textContent?.trim()).toBe('Online');

    await rerender({ inputs: { label: 'Status', options: OPTS, value: ['ONLINE', 'OFFLINE'] } });
    expect(container.querySelector('.chip__val')?.textContent?.trim()).toBe('2 selected');
  });

  it('chip count reflects selection length in multi mode', async () => {
    const { container } = await render(MultiSelectPickerComponent, {
      inputs: { label: 'Status', options: OPTS, value: ['ONLINE', 'OFFLINE'], multi: true },
    });
    expect(container.querySelector('.chip__count')?.textContent?.trim()).toBe('2');
  });

  it('multi mode adds/removes in draft; Save emits the draft', async () => {
    const onChange = vi.fn();
    const { fixture } = await render(MultiSelectPickerComponent, {
      inputs: { label: 'Status', options: OPTS, value: [], multi: true },
      on: { valueChange: onChange },
    });
    const c = fixture.componentInstance as unknown as MultiHarness;
    c.openSheet();
    c.toggle('ONLINE'); c.toggle('OFFLINE'); c.toggle('ONLINE'); // +online +offline -online
    c.save();
    expect(onChange).toHaveBeenCalledWith(['OFFLINE']);
  });

  it('single mode replaces the selection', async () => {
    const onChange = vi.fn();
    const { fixture } = await render(MultiSelectPickerComponent, {
      inputs: { label: 'Status', options: OPTS, value: ['ONLINE'], multi: false },
      on: { valueChange: onChange },
    });
    const c = fixture.componentInstance as unknown as MultiHarness;
    c.openSheet();
    c.toggle('OFFLINE'); c.toggle('MAINTENANCE');
    c.save();
    expect(onChange).toHaveBeenCalledWith(['MAINTENANCE']);
  });

  it('draft resets from value on each open (no commit without Save)', async () => {
    const { fixture } = await render(MultiSelectPickerComponent, {
      inputs: { label: 'Status', options: OPTS, value: ['ONLINE'] },
    });
    const c = fixture.componentInstance as unknown as MultiHarness;
    c.openSheet();
    c.toggle('OFFLINE');
    c.openSheet(); // reopen discards uncommitted draft
    expect(c.draft()).toEqual(['ONLINE']);
  });

  it('clear emits an empty array', async () => {
    const onChange = vi.fn();
    const { container } = await render(MultiSelectPickerComponent, {
      inputs: { label: 'Status', options: OPTS, value: ['ONLINE'] },
      on: { valueChange: onChange },
    });
    fireEvent.click(container.querySelector('.chip__x') as HTMLElement);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('filters options by query against label + meta', async () => {
    const { fixture } = await render(MultiSelectPickerComponent, {
      inputs: { label: 'Status', options: OPTS, value: [], searchable: true },
    });
    const c = fixture.componentInstance as unknown as MultiHarness;
    c.query.set('main');
    expect(c.filtered().map((o: PickerOption) => o.value)).toEqual(['MAINTENANCE']);
  });
});

describe('DevicePickerComponent', () => {
  const DEVICES = [
    { id: 'd1', name: 'rpi-01', status: 'ONLINE', location: 'Lab' },
    { id: 'd2', name: 'rpi-02', status: 'OFFLINE' },
  ];

  it('maps devices to options (status dot + "id · location" meta)', async () => {
    const { fixture } = await render(DevicePickerComponent, {
      inputs: { devices: DEVICES, value: [] },
    });
    const opts = (fixture.componentInstance as unknown as MappedHarness).options();
    expect(opts[0]).toMatchObject({ value: 'd1', label: 'rpi-01', dot: 'ONLINE', meta: 'd1 · Lab' });
    expect(opts[1].meta).toBe('d2'); // no location
  });

  it('shows the selected device name in the chip', async () => {
    const { container } = await render(DevicePickerComponent, {
      inputs: { devices: DEVICES, value: ['d1'] },
    });
    expect(container.querySelector('.chip__val')?.textContent?.trim()).toBe('rpi-01');
  });
});

describe('UserPickerComponent', () => {
  const USERS = [
    { id: 'u1', name: 'Ada', email: 'ada@x.io', role: 'ADMIN' },
    { id: 'u2', name: 'Bo', email: 'bo@x.io' },
  ];

  it('maps users to options ("email · role" meta)', async () => {
    const { fixture } = await render(UserPickerComponent, {
      inputs: { users: USERS, value: [] },
    });
    const opts = (fixture.componentInstance as unknown as MappedHarness).options();
    expect(opts[0]).toMatchObject({ value: 'u1', label: 'Ada', meta: 'ada@x.io · ADMIN' });
    expect(opts[1].meta).toBe('bo@x.io');
  });
});

describe('DateRangePickerComponent', () => {
  it('chip summary shows the preset label for the value', async () => {
    const { container } = await render(DateRangePickerComponent, {
      inputs: { value: '7d' },
    });
    expect(container.querySelector('.chip__val')?.textContent?.trim()).toBe('Last 7 days');
  });

  it('selecting a preset and saving emits its id', async () => {
    const onChange = vi.fn();
    const { fixture } = await render(DateRangePickerComponent, {
      inputs: { value: '24h' },
      on: { valueChange: onChange },
    });
    const c = fixture.componentInstance as unknown as DateHarness;
    c.openSheet();
    c.draft.set('30d');
    c.save();
    expect(onChange).toHaveBeenCalledWith('30d');
  });

  it('builds a current-month calendar grid including today', async () => {
    const { fixture } = await render(DateRangePickerComponent, {
      inputs: {},
    });
    const c = fixture.componentInstance as unknown as DateHarness;
    const dayCount = c.cells.filter((x: number | null) => x !== null).length;
    expect(dayCount).toBeGreaterThanOrEqual(28);
    expect(c.cells).toContain(c.today);
  });
});
