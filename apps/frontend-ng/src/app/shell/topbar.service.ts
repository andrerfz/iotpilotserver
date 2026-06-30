import { Injectable, signal } from '@angular/core';

export interface TopbarAction {
  icon: string;
  /** Display label shown in overflow menus. Optional on primary-only actions. */
  label?: string;
  handler: () => void;
}

@Injectable({ providedIn: 'root' })
export class TopbarService {
  readonly title = signal<string>('');
  readonly action = signal<TopbarAction | null>(null);
  readonly overflowActions = signal<TopbarAction[]>([]);

  set(title: string, primary?: TopbarAction | null, overflow?: TopbarAction[]): void {
    this.title.set(title);
    this.action.set(primary ?? null);
    this.overflowActions.set(overflow ?? []);
  }

  clear(): void {
    this.title.set('');
    this.action.set(null);
    this.overflowActions.set([]);
  }
}
