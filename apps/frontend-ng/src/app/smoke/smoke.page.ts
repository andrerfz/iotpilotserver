import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

interface HealthResponse {
  status: string;
  timestamp: string;
  environment: string;
  version: string;
}

@Component({
  selector: 'app-smoke',
  templateUrl: 'smoke.page.html',
  styleUrls: ['smoke.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
})
export class SmokePage implements OnInit {
  private readonly http = inject(HttpClient);

  health = signal<HealthResponse | null>(null);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<HealthResponse>('/api/health').subscribe({
      next: (data) => this.health.set(data),
      error: (err: { message?: string }) =>
        this.error.set(err.message ?? 'Failed to reach backend'),
    });
  }
}
