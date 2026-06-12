import { render, fireEvent } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { FilterChipComponent } from './filter-chip.component';
import { BottomSheetComponent } from './bottom-sheet.component';

// ─── FilterChipComponent ──────────────────────────────────────────────────────

describe('FilterChipComponent', () => {
  it('renders label and the chevron when inactive', async () => {
    const { container } = await render(FilterChipComponent, {
      inputs: { label: 'Devices' },
    });
    expect(container.querySelector('.chip__key')?.textContent?.trim()).toBe('Devices');
    expect(container.querySelector('ion-icon[name="chevron-down"]')).toBeTruthy();
    expect(container.querySelector('.chip__x')).toBeFalsy();
  });

  it('shows value and count when provided', async () => {
    const { container } = await render(FilterChipComponent, {
      inputs: { label: 'Devices', value: '3 selected', active: true, count: 3 },
    });
    expect(container.querySelector('.chip__val')?.textContent?.trim()).toBe('3 selected');
    expect(container.querySelector('.chip__count')?.textContent?.trim()).toBe('3');
  });

  it('does not render count badge when count is 0', async () => {
    const { container } = await render(FilterChipComponent, {
      inputs: { label: 'Devices', count: 0 },
    });
    expect(container.querySelector('.chip__count')).toBeFalsy();
  });

  it('renders the clear x and the active class when active', async () => {
    const { container } = await render(FilterChipComponent, {
      inputs: { label: 'Devices', active: true },
    });
    expect(container.querySelector('.chip--active')).toBeTruthy();
    expect(container.querySelector('.chip__x')).toBeTruthy();
    expect(container.querySelector('ion-icon[name="chevron-down"]')).toBeFalsy();
  });

  it('emits chipClick when the chip is clicked', async () => {
    const onClick = vi.fn();
    const { container } = await render(FilterChipComponent, {
      inputs: { label: 'Devices' },
      on: { chipClick: onClick },
    });
    fireEvent.click(container.querySelector('.chip') as HTMLElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('emits clear (and not chipClick) when the x is clicked', async () => {
    const onClick = vi.fn();
    const onClear = vi.fn();
    const { container } = await render(FilterChipComponent, {
      inputs: { label: 'Devices', active: true },
      on: { chipClick: onClick, clear: onClear },
    });
    fireEvent.click(container.querySelector('.chip__x') as HTMLElement);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled(); // stopPropagation
  });
});

// ─── BottomSheetComponent ─────────────────────────────────────────────────────

// Note: ion-modal relocates to an overlay container once isOpen=true, so these
// assert the inline element (open=false) — bindings/config/events live there.
describe('BottomSheetComponent', () => {
  it('renders an ion-modal bound to the open input + sheet breakpoints', async () => {
    const { container } = await render(BottomSheetComponent, {
      inputs: { open: false, title: 'Pick devices' },
    });
    const modal = container.querySelector('ion-modal') as HTMLElement & {
      isOpen?: boolean; breakpoints?: number[]; initialBreakpoint?: number;
    };
    expect(modal).toBeTruthy();
    expect(modal.isOpen).toBe(false);
    expect(modal.breakpoints).toEqual([0, 0.92, 1]);
    expect(modal.initialBreakpoint).toBe(0.92);
  });

  it('emits close on modal dismiss', async () => {
    const onClose = vi.fn();
    const { container } = await render(BottomSheetComponent, {
      inputs: { open: false, title: 'Pick' },
      on: { dismiss: onClose },
    });
    (container.querySelector('ion-modal') as HTMLElement)
      .dispatchEvent(new CustomEvent('ionModalDidDismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
