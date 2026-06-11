import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Alert } from '../api/generated/models/alert';
import { AlertsStream } from './alerts.stream';
import { SocketService } from './socket.service';

describe('AlertsStream', () => {
  let stream: Subject<Alert>;
  let alerts: AlertsStream;

  beforeEach(() => {
    stream = new Subject<Alert>();
    const fakeSocket = {
      on: (event: string) => (event === 'alert:new' ? stream.asObservable() : new Subject().asObservable()),
    };

    TestBed.configureTestingModule({
      providers: [AlertsStream, { provide: SocketService, useValue: fakeSocket }],
    });
    alerts = TestBed.inject(AlertsStream);
  });

  it('emits alerts pushed on the alert:new event', () => {
    const received: Alert[] = [];
    alerts.alerts$.subscribe((a) => received.push(a));

    const alert: Alert = { id: 'al1', deviceId: 'd1', severity: 'CRITICAL', title: 'High CPU' };
    stream.next(alert);

    expect(received).toEqual([alert]);
  });
});
