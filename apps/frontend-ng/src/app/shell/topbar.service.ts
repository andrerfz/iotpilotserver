import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

export interface TopbarAction {
  icon: string;
  handler: () => void;
}

@Injectable({ providedIn: 'root' })
export class TopbarService {
  readonly title = signal<string>('');
  readonly action = signal<TopbarAction | null>(null);

  constructor() {
    inject(Router).events
      .pipe(
        filter(e => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.clear());
  }

  set(title: string, action?: TopbarAction | null): void {
    this.title.set(title);
    this.action.set(action ?? null);
  }

  clear(): void {
    this.title.set('');
    this.action.set(null);
  }
}
