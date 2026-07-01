import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, fireEvent } from '@testing-library/angular';
import { ViewportService } from '@ng/core/layout/viewport.service';
import { UiNavSelectComponent, NavSelectItem } from './ui-nav-select.component';
import { BottomSheetComponent } from '../sheets/bottom-sheet.component';

const ITEMS: NavSelectItem[] = [
  { value: 'overview',  label: 'Overview' },
  { value: 'metrics',   label: 'Metrics' },
  { value: 'alerts',    label: 'Alerts', badge: 3 },
];

const mockViewportWide   = { wide: signal(true),  compact: signal(false) };
const mockViewportMobile = { wide: signal(false), compact: signal(true) };

/**
 * Stub BottomSheetComponent so its slot content renders directly in the DOM
 * (no IonModal/shadow-DOM wrapping). Exposes open/close as spies for assertions.
 */
@Component({ selector: 'ui-bottom-sheet', standalone: true, template: '<ng-content></ng-content>' })
class BottomSheetStubComponent {
  open = vi.fn();
  close = vi.fn();
  title = signal('');
  showSave = signal(true);
  breakpoint = signal(0.92);
}

async function renderSelect(
  value = 'overview',
  items = ITEMS,
  viewport = mockViewportWide,
) {
  return render(UiNavSelectComponent, {
    inputs: { value, items },
    providers: [
      { provide: ViewportService, useValue: viewport },
      { provide: BottomSheetComponent, useClass: BottomSheetStubComponent },
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
// ui-bottom-sheet wraps content inside <ion-modal><ng-template>, so slot content
// is not in the DOM when closed. Override the import to use a transparent stub
// that renders <ng-content> directly, making .opt rows queryable in tests.

describe('UiNavSelectComponent — mobile', () => {
  beforeEach(() => {
    TestBed.overrideComponent(UiNavSelectComponent, {
      remove: { imports: [BottomSheetComponent] },
      add:    { imports: [BottomSheetStubComponent] },
    });
  });

  async function renderMobile(value = 'overview', items = ITEMS) {
    return render(UiNavSelectComponent, {
      inputs: { value, items },
      providers: [{ provide: ViewportService, useValue: mockViewportMobile }],
    });
  }

  it('does not open CSS dropdown when trigger is clicked on mobile', async () => {
    const { container } = await renderMobile();
    fireEvent.click(container.querySelector('.nav-select__trigger')!);
    expect(container.querySelector('.nav-select__dropdown')).toBeNull();
  });

  it('renders opt rows inside the sheet for each item', async () => {
    const { container } = await renderMobile();
    expect(container.querySelectorAll('.opt').length).toBe(ITEMS.length);
  });

  it('marks the matching opt row as selected', async () => {
    const { container } = await renderMobile('metrics');
    const opts = container.querySelectorAll('.opt');
    expect(opts[1].classList.contains('opt--sel')).toBe(true);
    expect(opts[0].classList.contains('opt--sel')).toBe(false);
  });

  it('emits valueChange when an opt row is clicked', async () => {
    const onValueChange = vi.fn();
    const { container, fixture } = await renderMobile();
    fixture.componentInstance.valueChange.subscribe(onValueChange);
    fireEvent.click(container.querySelectorAll('.opt')[1]); // Metrics
    expect(onValueChange).toHaveBeenCalledWith('metrics');
  });
});
