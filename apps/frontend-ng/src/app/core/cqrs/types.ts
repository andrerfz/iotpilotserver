import { Type } from '@angular/core';

/**
 * Frontend CQRS contracts, mirroring `packages/core` naming. Commands/queries are
 * plain message objects; their `TenantAwareCommand` semantics live server-side
 * (derived from the JWT), so the client carries no tenant fields.
 */

/** Marker for a write message. */
export interface Command {
  /** Phantom brand — never set; distinguishes a Command from an arbitrary object. */
  readonly __command?: never;
}

/** Marker for a read message; `R` is the result type the handler resolves to. */
export interface Query<R = unknown> {
  /** Phantom — makes the result type inferable at `QueryBus.execute(query)`. Never set. */
  readonly __result?: R;
}

/** Handles one command type. `command` is the class it's registered against. */
export interface CommandHandler<C extends Command = Command, R = unknown> {
  readonly command: Type<C>;
  handle(command: C): Promise<R>;
}

/** Handles one query type. `query` is the class it's registered against. */
export interface QueryHandler<Q extends Query = Query, R = unknown> {
  readonly query: Type<Q>;
  handle(query: Q): Promise<R>;
}

/**
 * Stable lookup key for a message class — mirrors `packages/core` getCommandType:
 * a static `type` survives minification; otherwise fall back to the class name.
 */
export function messageType(ctor: { readonly name: string; readonly type?: string }): string {
  return ctor.type ?? ctor.name;
}
