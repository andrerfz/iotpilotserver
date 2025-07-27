import {vi} from 'vitest';

/**
 * Mock MQTT service for testing
 */
export class MqttMockService {
    private connected = false;
    private subscriptions: Map<string, Set<(topic: string, message: Buffer) => void>> = new Map();
    private publishedMessages: Array<{ topic: string; message: any; options?: any }> = [];

    // Mock MQTT client methods
    connect = vi.fn().mockImplementation(() => {
        this.connected = true;
        if (this.onConnectCallback) {
            setTimeout(() => this.onConnectCallback!(), 0);
        }
        return this;
    });

    disconnect = vi.fn().mockImplementation(() => {
        this.connected = false;
        if (this.onDisconnectCallback) {
            setTimeout(() => this.onDisconnectCallback!(), 0);
        }
        return this;
    });

    subscribe = vi.fn().mockImplementation((topic: string | string[], callback?: (topic: string, message: Buffer) => void) => {
        const topics = Array.isArray(topic) ? topic : [topic];

        for (const t of topics) {
            let subscribers = this.subscriptions.get(t);
            if (!subscribers) {
                subscribers = new Set();
                this.subscriptions.set(t, subscribers);
            }
            if (callback) {
                subscribers.add(callback);
            }
        }

        if (this.onSubscribeCallback) {
            setTimeout(() => this.onSubscribeCallback!(), 0);
        }

        return this;
    });

    unsubscribe = vi.fn().mockImplementation((topic: string | string[]) => {
        const topics = Array.isArray(topic) ? topic : [topic];

        for (const t of topics) {
            this.subscriptions.delete(t);
        }

        if (this.onUnsubscribeCallback) {
            setTimeout(() => this.onUnsubscribeCallback!(), 0);
        }

        return this;
    });

    publish = vi.fn().mockImplementation((topic: string, message: any, options?: any) => {
        this.publishedMessages.push({ topic, message, options });

        // Simulate message delivery to subscribers
        this.deliverMessage(topic, message);

        if (this.onPublishCallback) {
            setTimeout(() => this.onPublishCallback!(), 0);
        }

        return this;
    });

    // Event callback setters (simulating MQTT.js API)
    onConnectCallback?: () => void;
    onDisconnectCallback?: () => void;
    onSubscribeCallback?: () => void;
    onUnsubscribeCallback?: () => void;
    onPublishCallback?: () => void;
    onMessageCallback?: (topic: string, message: Buffer) => void;
    onErrorCallback?: (error: Error) => void;

    on = vi.fn().mockImplementation((event: string, callback: any) => {
        switch (event) {
            case 'connect':
                this.onConnectCallback = callback;
                break;
            case 'disconnect':
                this.onDisconnectCallback = callback;
                break;
            case 'subscribe':
                this.onSubscribeCallback = callback;
                break;
            case 'unsubscribe':
                this.onUnsubscribeCallback = callback;
                break;
            case 'publish':
                this.onPublishCallback = callback;
                break;
            case 'message':
                this.onMessageCallback = callback;
                break;
            case 'error':
                this.onErrorCallback = callback;
                break;
        }
        return this;
    });

    // Connection status is handled by the private property

    // Utility methods for testing
    isConnected(): boolean {
        return this.connected;
    }

    getSubscriptions(): Map<string, Set<(topic: string, message: Buffer) => void>> {
        return new Map(this.subscriptions);
    }

    getPublishedMessages(): Array<{ topic: string; message: any; options?: any }> {
        return [...this.publishedMessages];
    }

    getPublishedMessageCount(): number {
        return this.publishedMessages.length;
    }

    getSubscriberCount(topic: string): number {
        const subscribers = this.subscriptions.get(topic);
        return subscribers ? subscribers.size : 0;
    }

    // Simulate receiving a message from MQTT broker
    simulateMessage(topic: string, message: string | Buffer): void {
        const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
        this.deliverMessage(topic, messageBuffer);
    }

    // Simulate connection error
    simulateError(error: Error): void {
        if (this.onErrorCallback) {
            setTimeout(() => this.onErrorCallback!(error), 0);
        }
    }

    private deliverMessage(topic: string, message: Buffer): void {
        // Deliver to specific topic subscribers
        const topicSubscribers = this.subscriptions.get(topic);
        if (topicSubscribers) {
            topicSubscribers.forEach(callback => {
                try {
                    callback(topic, message);
                } catch (error) {
                    console.error('Error in MQTT mock subscriber:', error);
                }
            });
        }

        // Deliver to wildcard subscribers (basic implementation)
        for (const [subscribedTopic, subscribers] of this.subscriptions) {
            if (this.matchesTopic(topic, subscribedTopic)) {
                subscribers.forEach(callback => {
                    try {
                        callback(topic, message);
                    } catch (error) {
                        console.error('Error in MQTT mock subscriber:', error);
                    }
                });
            }
        }

        // Call global message callback
        if (this.onMessageCallback) {
            try {
                this.onMessageCallback(topic, message);
            } catch (error) {
                console.error('Error in MQTT mock message callback:', error);
            }
        }
    }

    private matchesTopic(messageTopic: string, subscribedTopic: string): boolean {
        // Simple wildcard matching (only supports + and #)
        if (subscribedTopic === '#') {
            return true;
        }

        const messageParts = messageTopic.split('/');
        const subscribedParts = subscribedTopic.split('/');

        if (messageParts.length !== subscribedParts.length && !subscribedTopic.includes('#')) {
            return false;
        }

        for (let i = 0; i < subscribedParts.length; i++) {
            if (subscribedParts[i] === '+') {
                continue;
            }
            if (subscribedParts[i] === '#') {
                return true;
            }
            if (subscribedParts[i] !== messageParts[i]) {
                return false;
            }
        }

        return true;
    }

    clearData(): void {
        this.subscriptions.clear();
        this.publishedMessages.length = 0;
        this.connected = false;
        this.onConnectCallback = undefined;
        this.onDisconnectCallback = undefined;
        this.onSubscribeCallback = undefined;
        this.onUnsubscribeCallback = undefined;
        this.onPublishCallback = undefined;
        this.onMessageCallback = undefined;
        this.onErrorCallback = undefined;
    }
}

/**
 * Factory function to create an MQTT mock service
 */
export function createMqttMock(): MqttMockService {
    return new MqttMockService();
}

/**
 * Mock MQTT module for import mocking
 */
export const mqttMockModule = {
    connect: vi.fn().mockImplementation(() => createMqttMock()),
    Client: vi.fn().mockImplementation(() => createMqttMock()),
};
