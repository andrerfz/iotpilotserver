import {
  Component, inject, input, model, signal, computed, effect, viewChild, ElementRef,
  HostListener, ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ng/shared/ui';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { search } from 'ionicons/icons';

addIcons({ search });

export interface CommandItem {
  group: string;
  label: string;
  icon: string;
  /** Absolute route to navigate to on select. */
  route?: string;
  /** Action to run on select (alternative to route). */
  action?: () => void;
  /** Keyboard hint shown on the right (e.g. "G D"). */
  kbd?: string;
}

/**
 * Command palette — prototype `CommandPalette`. ⌘K / Ctrl-K toggles open;
 * fuzzy (substring) filter over the supplied commands; ↑/↓ move, Enter selects,
 * Esc closes. Route commands navigate; action commands run. The host always
 * renders (so the ⌘K listener is live); the overlay shows only when open. On
 * narrow widths the overlay docks to the bottom as a sheet.
 */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, TranslatePipe],
  template: `
    @if (open()) {
      <div class="palette-wrap">
        <button class="palette-backdrop" aria-label="Close command palette" (click)="close()"></button>
        <div class="palette">
          <div class="palette__input">
            <ion-icon name="search"></ion-icon>
            <input #box [placeholder]="'shell.palette.search_ph' | translate"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
              (keydown)="onKeydown($event)" />
            <kbd class="mono">ESC</kbd>
          </div>
          <div class="palette__results">
            @for (it of filtered(); track it.label; let i = $index) {
              @if (it.group !== filtered()[i - 1]?.group) {
                <div class="palette__group">{{ it.group | translate }}</div>
              }
              <button class="palette__item" [class.palette__item--active]="i === active()"
                (mouseenter)="active.set(i)" (click)="run(it)">
                <ion-icon [name]="it.icon"></ion-icon>
                <span class="palette__label">{{ it.label | translate }}</span>
                @if (it.kbd) { <span class="mono">{{ it.kbd }}</span> }
              </button>
            } @empty {
              <div class="palette__empty">{{ 'shell.palette.no_matches' | translate }}</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './command-palette.component.scss',
})
export class CommandPaletteComponent {
  private readonly router = inject(Router);

  readonly open = model(false);
  readonly commands = input<CommandItem[]>([]);

  private readonly box = viewChild<ElementRef<HTMLInputElement>>('box');
  protected readonly query = signal('');
  protected readonly active = signal(0);

  protected readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const list = this.commands();
    return q ? list.filter(c => c.label.toLowerCase().includes(q)) : list;
  });

  constructor() {
    // Reset query + selection whenever the palette opens.
    effect(() => {
      if (this.open()) {
        this.query.set('');
        this.active.set(0);
      }
    });
    // Focus the input once it's rendered (replaces the autofocus attribute).
    effect(() => {
      const el = this.box();
      if (this.open() && el) el.nativeElement.focus();
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected onGlobalKey(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.open.update(o => !o);
    } else if (e.key === 'Escape' && this.open()) {
      this.close();
    }
  }

  protected onKeydown(e: KeyboardEvent): void {
    const max = this.filtered().length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.active.update(a => Math.min(a + 1, max));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.active.update(a => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      const it = this.filtered()[this.active()];
      if (it) this.run(it);
    }
  }

  protected run(it: CommandItem): void {
    this.close();
    if (it.route) {
      this.router.navigateByUrl(it.route);
    }
    it.action?.();
  }

  protected close(): void {
    this.open.set(false);
  }
}
