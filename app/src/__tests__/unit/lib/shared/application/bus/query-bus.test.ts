import { InMemoryQueryBus } from '../../../../../../lib/shared/application/bus/query.bus';

class TestQuery {
    constructor(public readonly id: string) {}
}

interface TestResult {
    id: string;
    value: string;
}

class TestQueryHandler {
    public executed = false;
    public lastQuery: TestQuery | null = null;

    async handle(query: TestQuery): Promise<TestResult> {
        this.executed = true;
        this.lastQuery = query;
        return {
            id: query.id,
            value: `Result for ${query.id}`
        };
    }
}

describe('InMemoryQueryBus', () => {
    it('should register and execute a query handler', async () => {
        // Arrange
        const queryBus = new InMemoryQueryBus();
        const handler = new TestQueryHandler();
        const query = new TestQuery('test-id');

        // Act
        queryBus.register(TestQuery, handler);
        const result = await queryBus.execute<TestQuery, TestResult>(query);

        // Assert
        expect(handler.executed).toBe(true);
        expect(handler.lastQuery).toBe(query);
        expect(result).toEqual({
            id: 'test-id',
            value: 'Result for test-id'
        });
    });

    it('should throw an error when no handler is registered for a query', async () => {
        // Arrange
        const queryBus = new InMemoryQueryBus();
        const query = new TestQuery('test-id');

        // Act & Assert
        await expect(queryBus.execute(query)).rejects.toThrow(
            `No handler found for TestQuery`
        );
    });
});