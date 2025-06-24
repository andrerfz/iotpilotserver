import { InMemoryEventBus, DomainEvent } from '../../../../../../lib/shared/application/bus/event.bus';

class TestEvent implements DomainEvent {
    readonly eventName = 'TestEvent';
    readonly occurredOn = new Date();

    constructor(public readonly id: string, public readonly data: string) {}
}

describe('InMemoryEventBus', () => {
    it('should publish events to subscribers', async () => {
        // Arrange
        const eventBus = new InMemoryEventBus();
        const event = new TestEvent('test-id', 'test-data');
        
        let receivedEvent: TestEvent | null = null;
        
        // Subscribe to the event
        eventBus.subscribe<TestEvent>('TestEvent', async (e) => {
            receivedEvent = e;
        });
        
        // Act
        await eventBus.publish(event);
        
        // Assert
        expect(receivedEvent).toBe(event);
    });
    
    it('should allow multiple subscribers for the same event', async () => {
        // Arrange
        const eventBus = new InMemoryEventBus();
        const event = new TestEvent('test-id', 'test-data');
        
        let subscriber1Called = false;
        let subscriber2Called = false;
        
        // Subscribe to the event with two different handlers
        eventBus.subscribe<TestEvent>('TestEvent', async () => {
            subscriber1Called = true;
        });
        
        eventBus.subscribe<TestEvent>('TestEvent', async () => {
            subscriber2Called = true;
        });
        
        // Act
        await eventBus.publish(event);
        
        // Assert
        expect(subscriber1Called).toBe(true);
        expect(subscriber2Called).toBe(true);
    });
    
    it('should not call subscribers for different events', async () => {
        // Arrange
        const eventBus = new InMemoryEventBus();
        const event = new TestEvent('test-id', 'test-data');
        
        let subscriberCalled = false;
        
        // Subscribe to a different event
        eventBus.subscribe<TestEvent>('DifferentEvent', async () => {
            subscriberCalled = true;
        });
        
        // Act
        await eventBus.publish(event);
        
        // Assert
        expect(subscriberCalled).toBe(false);
    });
});