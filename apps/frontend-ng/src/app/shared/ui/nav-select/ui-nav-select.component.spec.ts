import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { render, fireEvent } from '@testing-library/angular';
import { ActionSheetController } from '@ionic/angular/standalone';
import { ViewportService } from '@ng/core/layout/viewport.service';
import { UiNavSelectComponent, NavSelectItem } from './ui-nav-select.component';

const ITEMS: NavSelectItem[] = [
  { value: 'overview',  label: 'Overview' },
  { value: 'metrics',   label: 'Metrics' },
  { value: 'alerts',    label: 'Alerts', badge: 3 },
];

const mockViewportWide  = { wide: signal(true),  compact: signal(false) };
const mockViewportMobile = { wide: signal(false), compact: signal(true) };

function mockSheetCtrl() {
  const present = vi.fn().mockResolvedValue(undefined);
  const create  = vi.fn().mockResolvedValue({ present });
  return { ctrl: { create } as unknown as ActionSheetController, present, create };
}

async function renderSelect(
  value = 'overview',
  items = ITEMS,
  viewport = mockViewportWide,
  sheetCtrl?: ActionSheetController,
) {
  return render(UiNavSelectComponent, {
    inputs: { value, items },
    providers: [
      { provide: ViewportService,       useValue: viewport },
      { provide: ActionSheetController, useValue: sheetCtrl ?? mockSheetCtrl().ctrl },
    ],
  });
}

// ─── Desktop (wide) ──────────────────────────────────────────────────────────

describe('UiNavSelectComponent — desktop', () => {
  describe('activeItem', () => {
    it('returns the item matching value', async () => {
      const { fixture } = await renderSelect('metrics');
      expect(fixture.componentInstance.activeItem()?.value).toBe('metrics');
    });

    it('falls back to first item when value does not match', async () => {
      const { fixture } = await renderSelect('unknown');
      expect(fixture.componentInstance.activeItem()?.value).toBe('overview');
    });
  });

  describe('trigger', () => {
    it('shows the active item label in the trigger button', async () => {
      const { container } = await renderSelect('metrics');
      expect(container.querySelector('.nav-select__label')?.textContent?.trim()).toBe('Metrics');
    });

    it('shows badge on trigger when active item has badge > 0', async () => {
      const { container } = await renderSelect('alerts');
      expect(container.querySelector('.nav-select__badge')).toBeTruthy();
    });

    it('does not show badge on trigger when active item has no badge', async () => {
      const { container } = await renderSelect('overview');
      expect(container.querySelector('.nav-select__badge')).toBeNull();
    });

    it('sets aria-expanded="false" when closed', async () => {
      const { container } = await renderSelect();
      expect(container.querySelector('.nav-select__trigger')?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('dropdown open/close', () => {
    it('opens dropdown when trigger is clicked', async () => {
      const { container } = await renderSelect();
      fireEvent.click(container.querySelector('.nav-select__trigger')!);
      expect(container.querySelector('.nav-select__dropdown')).toBeTruthy();
    });

    it('sets aria-expanded="true" when open', async () => {
      const { container } = await renderSelect();
      fireEvent.click(container.querySelector('.nav-select__trigger')!);
      expect(container.querySelector('.nav-select__trigger')?.getAttribute('aria-expanded')).toBe('true');
    });

    it('closes dropdown on Escape key', async () => {
      const { container } = await renderSelect();
      fireEvent.click(container.querySelector('.nav-select__trigger')!);
      expect(container.querySelector('.nav-select__dropdown')).toBeTruthy();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(container.querySelector('.nav-select__dropdown')).toBeNull();
    });
  });

  describe('item selection', () => {
    it('emits valueChange with item.value when option clicked', async () => {
      const onValueChange = vi.fn();
      const { container, fixture } = await renderSelect('overview', ITEMS);
      fixture.componentInstance.valueChange.subscribe(onValueChange);
      fireEvent.click(container.querySelector('.nav-select__trigger')!);
      const options = container.querySelectorAll('.nav-select__option');
      fireEvent.click(options[1]); // Metrics
      expect(onValueChange).toHaveBeenCalledWith('metrics');
    });

    it('closes dropdown after selecting an item', async () => {
      const { container } = await renderSelect();
      fireEvent.click(container.querySelector('.nav-select__trigger')!);
      const options = container.querySelectorAll('.nav-select__option');
      fireEvent.click(options[0]);
      expect(container.querySelector('.nav-select__dropdown')).toBeNull();
    });

    it('marks the matching option as active', async () => {
      const { container } = await renderSelect('metrics');
      fireEvent.click(container.querySelector('.nav-select__trigger')!);
      const options = container.querySelectorAll('.nav-select__option');
      expect(options[1].classList.contains('nav-select__option--active')).toBe(true);
      expect(options[0].classList.contains('nav-select__option--active')).toBe(false);
    });

    it('renders badge in dropdown option when item has badge', async () => {
      const { container } = await renderSelect('overview');
      fireEvent.click(container.querySelector('.nav-select__trigger')!);
      const options = container.querySelectorAll('.nav-select__option');
      expect(options[2].querySelector('.nav-select__badge--sm')).toBeTruthy();
    });
  });
});

// ─── Mobile (narrow) ─────────────────────────────────────────────────────────

describe('UiNavSelectComponent — mobile', () => {
  it('does not open CSS dropdown when trigger is clicked on mobile', async () => {
    const { container } = await renderSelect('overview', ITEMS, mockViewportMobile);
    fireEvent.click(container.querySelector('.nav-select__trigger')!);
    expect(container.querySelector('.nav-select__dropdown')).toBeNull();
  });

  it('calls ActionSheetController.create when trigger is clicked on mobile', async () => {
    const { ctrl, create } = mockSheetCtrl();
    const { container } = await renderSelect('overview', ITEMS, mockViewportMobile, ctrl);
    fireEvent.click(container.querySelector('.nav-select__trigger')!);
    await Promise.resolve();
    expect(create).toHaveBeenCalled();
  });

  it('passes all item labels to the action sheet buttons', async () => {
    const { ctrl, create } = mockSheetCtrl();
    const { container } = await renderSelect('overview', ITEMS, mockViewportMobile, ctrl);
    fireEvent.click(container.querySelector('.nav-select__trigger')!);
    await Promise.resolve();
    const buttons = create.mock.calls[0]?.[0]?.buttons as Array<{ text: string }>;
    expect(buttons?.map((b) => b.text)).toEqual(['Overview', 'Metrics', 'Alerts']);
  });
});
