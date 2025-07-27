import {Command, CommandHandler} from '../interfaces/command.interface';

export interface CommandBus {
    execute<T extends Command, R = void>(command: T): Promise<R>;
}

/**
 * Gets a stable identifier for a command class that survives minification.
 * Uses static 'type' property if available, otherwise falls back to constructor name.
 */
function getCommandType(commandClass: any): string {
    // Check for static type property first (survives minification)
    if (commandClass.type) {
        return commandClass.type;
    }
    // Fallback to name (will break in production if minified)
    return commandClass.name;
}

export class InMemoryCommandBus implements CommandBus {
    private handlers = new Map<string, CommandHandler<any, any>>();

    register<T extends Command, R = void>(
        commandClass: new (...args: any[]) => T,
        handler: CommandHandler<T, R>
    ): void {
        const commandType = getCommandType(commandClass);
        this.handlers.set(commandType, handler);
    }

    async execute<T extends Command, R = void>(command: T): Promise<R> {
        // Get type from static property or constructor
        const commandType = getCommandType(command.constructor);
        const handler = this.handlers.get(commandType);

        if (!handler) {
            console.error(`[CommandBus] No handler for command type: ${commandType}`);
            console.error(`[CommandBus] Registered types: ${Array.from(this.handlers.keys()).join(', ')}`);
            throw new Error(`No handler found for ${commandType}`);
        }

        return await handler.handle(command);
    }
}
