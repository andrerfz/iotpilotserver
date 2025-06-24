import { InMemoryCommandBus } from '../../../../../../lib/shared/application/bus/command.bus';

class TestCommand {
    constructor(public readonly id: string) {}
}

class TestCommandHandler {
    public executed = false;
    public lastCommand: TestCommand | null = null;

    async handle(command: TestCommand): Promise<void> {
        this.executed = true;
        this.lastCommand = command;
    }
}

describe('InMemoryCommandBus', () => {
    it('should register and execute a command handler', async () => {
        // Arrange
        const commandBus = new InMemoryCommandBus();
        const handler = new TestCommandHandler();
        const command = new TestCommand('test-id');

        // Act
        commandBus.register(TestCommand, handler);
        await commandBus.execute(command);

        // Assert
        expect(handler.executed).toBe(true);
        expect(handler.lastCommand).toBe(command);
    });

    it('should throw an error when no handler is registered for a command', async () => {
        // Arrange
        const commandBus = new InMemoryCommandBus();
        const command = new TestCommand('test-id');

        // Act & Assert
        await expect(commandBus.execute(command)).rejects.toThrow(
            `No handler found for TestCommand`
        );
    });
});