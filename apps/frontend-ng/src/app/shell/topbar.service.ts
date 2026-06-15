import { Injectable, signal } from '@angular/core';

export interface TopbarAction {
  icon: string;
  handler: () => void;
}

@Injectable({ providedIn: 'root' })
export class TopbarService {
  readonly title = signal<string>('');
  readonly action = signal<TopbarAction | null>(null);

  set(title: string, action?: TopbarAction | null): void {
    this.title.set(title);
    this.action.set(action ?? null);
  }

  clear(): void {
    this.title.set('');
    this.action.set(null);
  }
}
