import {describe, it, expect, beforeEach} from 'vitest';
import {InMemoryCommandBus} from '../command.bus';
import {Command, CommandHandler} from '../../interfaces/command.interface';

class TestCommand implements Command {
    constructor(public readonly value: string) {
    }
}

class TestCommandHandler implements CommandHandler<TestCommand> {
    public lastHandledCommand: TestCommand | null = null;

    async handle(command: TestCommand): Promise<void> {
        this.lastHandledCommand = command;
    }
}

describe('InMemoryCommandBus', () => {
    let commandBus: InMemoryCommandBus;
    let handler: TestCommandHandler;

    beforeEach(() => {
        commandBus = new InMemoryCommandBus();
        handler = new TestCommandHandler();
    });

    it('should execute registered command', async () => {
        // Arrange
        commandBus.register(TestCommand, handler);
        const command = new TestCommand('test');

        // Act
        await commandBus.execute(command);

        // Assert
        expect(handler.lastHandledCommand).toBe(command);
    });

    it('should throw error for unregistered command', async () => {
        // Arrange
        const command = new TestCommand('test');

        // Act & Assert
        await expect(commandBus.execute(command)).rejects.toThrow(
            'No handler found for TestCommand'
        );
    });
});
