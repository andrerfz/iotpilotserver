import {describe, it, expect, beforeEach, vi} from 'vitest';
import {InMemoryEventBus} from '../event.bus';
import {DomainEvent, DomainEventBase} from '@/lib/customer/shared/events/domain.event';
import {EventHandler} from '../event.bus';

class TestEvent extends DomainEventBase {
    constructor(public readonly value: string) {
        super();
    }
}

class TestEventHandler implements EventHandler<TestEvent> {
    public lastHandledEvent: TestEvent | null = null;
    public handleMock = vi.fn();

    async handle(event: TestEvent): Promise<void> {
        this.lastHandledEvent = event;
        this.handleMock(event);
    }
}

describe('InMemoryEventBus', () => {
    let eventBus: InMemoryEventBus;
    let handler: TestEventHandler;

    beforeEach(() => {
        eventBus = new InMemoryEventBus();
        handler = new TestEventHandler();
    });

    it('should publish event to registered handler', async () => {
        // Arrange
        const event = new TestEvent('test');
        eventBus.subscribe(event.eventType, handler);

        // Act
        await eventBus.publish(event);

        // Assert
        expect(handler.lastHandledEvent).toBe(event);
        expect(handler.handleMock).toHaveBeenCalledWith(event);
    });

    it('should not call handler if not subscribed to event type', async () => {
        // Arrange
        const event = new TestEvent('test');
        
        // Act
        await eventBus.publish(event);

        // Assert
        expect(handler.lastHandledEvent).toBeNull();
        expect(handler.handleMock).not.toHaveBeenCalled();
    });

    it('should allow multiple handlers for the same event type', async () => {
        // Arrange
        const event = new TestEvent('test');
        const handler2 = new TestEventHandler();
        
        eventBus.subscribe(event.eventType, handler);
        eventBus.subscribe(event.eventType, handler2);

        // Act
        await eventBus.publish(event);

        // Assert
        expect(handler.lastHandledEvent).toBe(event);
        expect(handler2.lastHandledEvent).toBe(event);
        expect(handler.handleMock).toHaveBeenCalledWith(event);
        expect(handler2.handleMock).toHaveBeenCalledWith(event);
    });
});