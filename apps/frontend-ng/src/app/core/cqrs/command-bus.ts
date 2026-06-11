import { inject, Injectable, InjectionToken, Provider, Type } from '@angular/core';
import { Command, CommandHandler, messageType } from './types';

/** Multi-provider token collecting every registered command handler. */
export const COMMAND_HANDLERS = new InjectionToken<CommandHandler[]>('COMMAND_HANDLERS');

/**
 * Dispatches commands to their registered handler. Replaces the legacy tsyringe
 * CommandBus; handlers are wired through Angular DI multi-providers
 * ({@link provideCommandHandler}) rather than manual registration.
 */
@Injectable({ providedIn: 'root' })
export class CommandBus {
  private readonly handlers = new Map<string, CommandHandler>();

  constructor() {
    for (const handler of inject(COMMAND_HANDLERS, { optional: true }) ?? []) {
      this.handlers.set(messageType(handler.command), handler);
    }
  }

  execute<R = void>(command: Command): Promise<R> {
    const key = messageType(command.constructor);
    const handler = this.handlers.get(key);
    if (!handler) {
      throw new Error(`No handler registered for command "${key}"`);
    }
    return handler.handle(command) as Promise<R>;
  }
}

/**
 * Register a command handler. Provides the handler class and adds it to the
 * COMMAND_HANDLERS multi-provider so the bus discovers it via DI.
 */
export function provideCommandHandler<C extends Command, R>(
  handler: Type<CommandHandler<C, R>>,
): Provider[] {
  return [handler, { provide: COMMAND_HANDLERS, useExisting: handler, multi: true }];
}
