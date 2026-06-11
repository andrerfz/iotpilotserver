import { Component, computed, inject, OnInit } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ng/shared/ui';
import { GetHealthQuery, HealthResult } from '../core/cqrs/example/get-health.query';
import { QueryBus } from '../core/cqrs/query-bus';
import { runQuery } from '../core/cqrs/run-query';

@Component({
  selector: 'app-smoke',
  templateUrl: 'smoke.page.html',
  styleUrls: ['smoke.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
})
export class SmokePage implements OnInit {
  // Touch the bus so the example handler is wired (also makes the dependency explicit).
  private readonly bus = inject(QueryBus);
  private readonly query = runQuery<HealthResult>();

  readonly health = this.query.data;
  readonly error = computed(() => this.query.error()?.message ?? null);

  ngOnInit(): void {
    void this.query.run(new GetHealthQuery());
  }
}
