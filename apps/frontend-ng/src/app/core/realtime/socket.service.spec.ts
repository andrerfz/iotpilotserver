import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { InMemoryTokenStorage, TokenStorage } from '../auth/token.storage';
import { SocketService } from './socket.service';

// Controllable fake socket + io() mock, shared with the test via vi.hoisted.
const { ioMock, makeSocket } = vi.hoisted(() => {
  const makeSocket = () => {
    const handlers = new Map<string, (data?: unknown) => void>();
    return {
      connected: false,
      on(event: string, cb: (data?: unknown) => void) {
        handlers.set(event, cb);
        return this;
      },
      off(event: string) {
        handlers.delete(event);
        return this;
      },
      disconnect: vi.fn(function (this: { connected: boolean }) {
        this.connected = false;
      }),
      trigger(event: string, data?: unknown) {
        handlers.get(event)?.(data);
      },
    };
  };
  return { ioMock: vi.fn(), makeSocket };
});

vi.mock('socket.io-client', () => ({ io: ioMock }));

describe('SocketService', () => {
  let tokens: TokenStorage;
  let authed: WritableSignal<boolean>;
  let socket: SocketService;
  let fakeSocket: ReturnType<typeof makeSocket>;

  beforeEach(() => {
    fakeSocket = makeSocket();
    ioMock.mockReset();
    ioMock.mockReturnValue(fakeSocket);
    authed = signal(false);

    TestBed.configureTestingModule({
      providers: [
        SocketService,
        { provide: TokenStorage, useClass: InMemoryTokenStorage },
        { provide: AuthService, useValue: { isAuthenticated: authed } },
      ],
    });
    tokens = TestBed.inject(TokenStorage);
    socket = TestBed.inject(SocketService);
  });

  it('connect() opens a socket with the token in the auth payload', async () => {
    await tokens.set('jwt-1');
    await socket.connect();

    expect(ioMock).toHaveBeenCalledTimes(1);
    const opts = ioMock.mock.calls[0][0] as { auth: { token: string }; transports: string[] };
    expect(opts.auth).toEqual({ token: 'jwt-1' });
    expect(opts.transports).toContain('websocket');
  });

  it('connect() is a no-op without a stored token', async () => {
    await socket.connect();
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('tracks the connected signal from socket events', async () => {
    await tokens.set('jwt-1');
    await socket.connect();
    expect(socket.connected()).toBe(false);

    fakeSocket.trigger('connect');
    expect(socket.connected()).toBe(true);

    fakeSocket.trigger('disconnect');
    expect(socket.connected()).toBe(false);
  });

  it('disconnect() closes the socket and resets connected', async () => {
    await tokens.set('jwt-1');
    await socket.connect();
    fakeSocket.trigger('connect');

    socket.disconnect();

    expect(fakeSocket.disconnect).toHaveBeenCalled();
    expect(socket.connected()).toBe(false);
  });

  it('on() streams server events to subscribers', async () => {
    await tokens.set('jwt-1');
    await socket.connect();

    const received: unknown[] = [];
    socket.on<{ id: string }>('alert:new').subscribe((a) => received.push(a));
    fakeSocket.trigger('alert:new', { id: 'a1' });

    expect(received).toEqual([{ id: 'a1' }]);
  });

  it('connects when auth becomes authenticated (lifecycle effect)', async () => {
    await tokens.set('jwt-1');
    authed.set(true);
    TestBed.flushEffects();
    await Promise.resolve();

    expect(ioMock).toHaveBeenCalledTimes(1);
  });
});
