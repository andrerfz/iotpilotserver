export interface Command {
}

export interface CommandHandler<T extends Command, R = void> {
    handle(command: T): Promise<R>;
}