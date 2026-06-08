import {describe, it, expect, beforeEach} from 'vitest';
import {InMemoryQueryBus} from '../query.bus';
import {Query, QueryHandler} from '../../interfaces/query.interface';

class TestQuery implements Query<string> {
    constructor(public readonly value: string) {
    }
}

class TestQueryHandler implements QueryHandler<TestQuery, string> {
    public lastHandledQuery: TestQuery | null = null;

    async handle(query: TestQuery): Promise<string> {
        this.lastHandledQuery = query;
        return `Result: ${query.value}`;
    }
}

describe('InMemoryQueryBus', () => {
    let queryBus: InMemoryQueryBus;
    let handler: TestQueryHandler;

    beforeEach(() => {
        queryBus = new InMemoryQueryBus();
        handler = new TestQueryHandler();
    });

    it('should execute registered query', async () => {
        // Arrange
        queryBus.register(TestQuery, handler);
        const query = new TestQuery('test');

        // Act
        const result = await queryBus.execute(query);

        // Assert
        expect(handler.lastHandledQuery).toBe(query);
        expect(result).toBe('Result: test');
    });

    it('should throw error for unregistered query', async () => {
        // Arrange
        const query = new TestQuery('test');

        // Act & Assert
        await expect(queryBus.execute(query)).rejects.toThrow(
            'No handler found for TestQuery'
        );
    });
});
