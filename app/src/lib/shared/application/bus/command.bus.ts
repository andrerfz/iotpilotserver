import {Command, CommandHandler} from '../interfaces/command.interface';

export interface CommandBus {
    execute<T extends Command, R = void>(command: T): Promise<R>;
}

export class InMemoryCommandBus implements CommandBus {
    private handlers = new Map<string, CommandHandler<any, any>>();

    register<T extends Command, R = void>(
        commandClass: new (...args: any[]) => T,
        handler: CommandHandler<T, R>
    ): void {
        this.handlers.set(commandClass.name, handler);
    }

    async execute<T extends Command, R = void>(command: T): Promise<R> {
        const commandName = command.constructor.name;
        const handler = this.handlers.get(commandName);

        if (!handler) {
            throw new Error(`No handler found for ${commandName}`);
        }

        return await handler.handle(command);
    }
}
