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

// Note: ion-modal relocates to an overlay container once presented, so these
// assert the inline element — sheet config and lifecycle events live there.
describe('BottomSheetComponent', () => {
  it('renders an ion-modal configured as a 0.92 sheet', async () => {
    const { container } = await render(BottomSheetComponent, {
      inputs: { title: 'Pick devices' },
    });
    const modal = container.querySelector('ion-modal') as HTMLElement & {
      initialBreakpoint?: number; breakpoints?: number[];
    };
    expect(modal).toBeTruthy();
    expect(modal.initialBreakpoint).toBe(0.92);
    expect(modal.breakpoints).toEqual([0, 0.92]);
    expect(modal.classList.contains('ui-sheet')).toBe(true);
  });

  it('open() presents the modal (honoring initialBreakpoint)', async () => {
    const { fixture, container } = await render(BottomSheetComponent, {
      inputs: { title: 'Pick' },
    });
    const modal = container.querySelector('ion-modal') as HTMLElement & { present: () => Promise<void> };
    const present = vi.spyOn(modal, 'present').mockResolvedValue(undefined);
    fixture.componentInstance.open();
    expect(present).toHaveBeenCalledTimes(1);
  });

  it('emits willOpen when the modal will present', async () => {
    const onWillOpen = vi.fn();
    const { container } = await render(BottomSheetComponent, {
      inputs: { title: 'Pick' },
      on: { willOpen: onWillOpen },
    });
    (container.querySelector('ion-modal') as HTMLElement)
      .dispatchEvent(new CustomEvent('ionModalWillPresent'));
    expect(onWillOpen).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss on modal dismiss', async () => {
    const onClose = vi.fn();
    const { container } = await render(BottomSheetComponent, {
      inputs: { title: 'Pick' },
      on: { dismiss: onClose },
    });
    (container.querySelector('ion-modal') as HTMLElement)
      .dispatchEvent(new CustomEvent('ionModalDidDismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
