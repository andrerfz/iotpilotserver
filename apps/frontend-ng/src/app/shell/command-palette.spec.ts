import { render, fireEvent } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { Router } from '@angular/router';
import { CommandPaletteComponent, CommandItem } from './command-palette.component';

const CMDS: CommandItem[] = [
  { group: 'Navigate', label: 'Dashboard', icon: 'grid-outline', route: '/app/dashboard' },
  { group: 'Navigate', label: 'Devices', icon: 'hardware-chip-outline', route: '/app/devices' },
  { group: 'Actions', label: 'Refresh telemetry', icon: 'refresh', action: vi.fn() },
];

function setup(open: boolean, commands: CommandItem[] = CMDS, nav = vi.fn()) {
  return render(CommandPaletteComponent, {
    inputs: { open, commands },
    providers: [{ provide: Router, useValue: { navigateByUrl: nav } }],
  });
}

describe('CommandPaletteComponent', () => {
  it('Cmd-K toggles the palette open', async () => {
    const { container, fixture } = await setup(false);
    expect(container.querySelector('.palette')).toBeFalsy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    fixture.detectChanges();
    expect((fixture.componentInstance as CommandPaletteComponent).open()).toBe(true);
  });

  it('filters commands by query (substring, case-insensitive)', async () => {
    const { container, fixture } = await setup(true);
    const input = container.querySelector('.palette__input input') as HTMLInputElement;
    input.value = 'dev';
    fireEvent.input(input);
    fixture.detectChanges();
    expect(Array.from(container.querySelectorAll('.palette__label')).map(l => l.textContent?.trim()))
      .toEqual(['Devices']);
  });

  it('ArrowDown then Enter navigates the active route command', async () => {
    const nav = vi.fn();
    const { container } = await setup(true, CMDS, nav);
    const input = container.querySelector('.palette__input input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // 0 → 1 (Devices)
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(nav).toHaveBeenCalledWith('/app/devices');
  });

  it('runs action commands on click', async () => {
    const action = vi.fn();
    const { container } = await setup(true, [{ group: 'Actions', label: 'Refresh', icon: 'refresh', action }]);
    fireEvent.click(container.querySelector('.palette__item') as HTMLElement);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('Escape closes the palette', async () => {
    const { fixture } = await setup(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect((fixture.componentInstance as CommandPaletteComponent).open()).toBe(false);
  });

  it('backdrop click closes the palette', async () => {
    const { container, fixture } = await setup(true);
    fireEvent.click(container.querySelector('.palette-backdrop') as HTMLElement);
    expect((fixture.componentInstance as CommandPaletteComponent).open()).toBe(false);
  });

  it('groups commands with a header per group', async () => {
    const { container } = await setup(true);
    expect(Array.from(container.querySelectorAll('.palette__group')).map(g => g.textContent?.trim()))
      .toEqual(['Navigate', 'Actions']);
  });
});
