export interface CommandBus {
    execute<T>(command: T): Promise<void>;
}

export class InMemoryCommandBus implements CommandBus {
    private handlers = new Map<string, any>();

    register<T>(commandClass: new (...args: any[]) => T, handler: any) {
        this.handlers.set(commandClass.name, handler);
    }

    async execute<T>(command: T): Promise<void> {
        const handler = this.handlers.get(command.constructor.name);
        if (!handler) {
            throw new Error(`No handler found for ${command.constructor.name}`);
        }
        return await handler.handle(command);
    }
}