import { Injectable, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CommandBus, provideCommandHandler } from './command-bus';
import { provideQueryHandler, QueryBus } from './query-bus';
import { Command, CommandHandler, Query, QueryHandler } from './types';

class PingCommand implements Command {
  static readonly type = 'PingCommand';
  constructor(readonly value: string) {}
}

@Injectable()
class PingHandler implements CommandHandler<PingCommand, string> {
  readonly command = PingCommand;
  handle(command: PingCommand): Promise<string> {
    return Promise.resolve(`pong:${command.value}`);
  }
}

class SumQuery implements Query<number> {
  static readonly type = 'SumQuery';
  constructor(readonly a: number, readonly b: number) {}
}

@Injectable()
class SumHandler implements QueryHandler<SumQuery, number> {
  readonly query = SumQuery;
  handle(query: SumQuery): Promise<number> {
    return Promise.resolve(query.a + query.b);
  }
}

describe('CommandBus', () => {
  it('dispatches a command to its registered handler', async () => {
    TestBed.configureTestingModule({ providers: [provideCommandHandler(PingHandler)] });
    const bus = TestBed.inject(CommandBus);
    expect(await bus.execute<string>(new PingCommand('hi'))).toBe('pong:hi');
  });

  it('throws for an unregistered command', () => {
    TestBed.configureTestingModule({ providers: [] });
    const bus = TestBed.inject(CommandBus);
    class Unknown implements Command {}
    expect(() => bus.execute(new Unknown())).toThrow(/No handler registered/);
  });
});

describe('QueryBus', () => {
  it('dispatches a query to its registered handler', async () => {
    TestBed.configureTestingModule({ providers: [provideQueryHandler(SumHandler)] });
    const bus = TestBed.inject(QueryBus);
    expect(await bus.execute(new SumQuery(2, 3))).toBe(5);
  });

  it('throws for an unregistered query', () => {
    TestBed.configureTestingModule({ providers: [] });
    const bus = TestBed.inject(QueryBus);
    class Unknown implements Query<void> {}
    expect(() => bus.execute(new Unknown())).toThrow(/No handler registered/);
  });

  it('supports multiple handlers registered together', async () => {
    @Injectable()
    class EchoHandler implements QueryHandler<EchoQuery, string> {
      readonly query = EchoQuery;
      handle(q: EchoQuery): Promise<string> {
        return Promise.resolve(q.text);
      }
    }
    class EchoQuery implements Query<string> {
      static readonly type = 'EchoQuery';
      constructor(readonly text: string) {}
    }
    TestBed.configureTestingModule({
      providers: [provideQueryHandler(SumHandler), provideQueryHandler(EchoHandler as Type<QueryHandler>)],
    });
    const bus = TestBed.inject(QueryBus);
    expect(await bus.execute(new SumQuery(1, 1))).toBe(2);
    expect(await bus.execute(new EchoQuery('hey'))).toBe('hey');
  });
});
