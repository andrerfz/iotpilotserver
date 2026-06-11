/// <reference lib="dom" />
import {vi} from 'vitest';

/**
 * Mock WebSocket service for testing
 */
export class WebSocketMockService {
    private readyStateValue = 0; // CONNECTING
    private messageHandlers: Set<(event: MessageEvent) => void> = new Set();
    private closeHandlers: Set<(event: CloseEvent) => void> = new Set();
    private errorHandlers: Set<(event: Event) => void> = new Set();
    private openHandlers: Set<(event: Event) => void> = new Set();
    private sentMessages: any[] = [];
    private isClosed = false;

    // WebSocket properties
    get readyState(): number {
        return this.readyStateValue;
    }

    // WebSocket methods
    send = vi.fn().mockImplementation((data: any) => {
        if (this.readyStateValue !== 1) { // OPEN
            throw new Error('WebSocket is not open');
        }
        this.sentMessages.push(data);
    });

    close = vi.fn().mockImplementation((code?: number, reason?: string) => {
        this.readyStateValue = 2 // CLOSING;
        this.isClosed = true;

        // Simulate close event
        setTimeout(() => {
            this.readyStateValue = 3 // CLOSED;
            const closeEvent = new CloseEvent('close', { code: code || 1000, reason: reason || '' });
            this.closeHandlers.forEach(handler => {
                try {
                    handler(closeEvent);
                } catch (error) {
                    console.error('Error in WebSocket close handler:', error);
                }
            });
        }, 0);
    });

    // Event handler methods (simulating EventTarget interface)
    addEventListener = vi.fn().mockImplementation((type: string, listener: any) => {
        switch (type) {
            case 'message':
                this.messageHandlers.add(listener);
                break;
            case 'close':
                this.closeHandlers.add(listener);
                break;
            case 'error':
                this.errorHandlers.add(listener);
                break;
            case 'open':
                this.openHandlers.add(listener);
                break;
        }
    });

    removeEventListener = vi.fn().mockImplementation((type: string, listener: any) => {
        switch (type) {
            case 'message':
                this.messageHandlers.delete(listener);
                break;
            case 'close':
                this.closeHandlers.delete(listener);
                break;
            case 'error':
                this.errorHandlers.delete(listener);
                break;
            case 'open':
                this.openHandlers.delete(listener);
                break;
        }
    });

    // Legacy event handler properties (for compatibility)
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;

    // Utility methods for testing
    getSentMessages(): any[] {
        return [...this.sentMessages];
    }

    getSentMessageCount(): number {
        return this.sentMessages.length;
    }

    isWebSocketClosed(): boolean {
        return this.isClosed;
    }

    // Simulate opening the connection
    simulateOpen(): void {
        this.readyStateValue = 1 // OPEN;
        const openEvent = new Event('open');

        // Call legacy handler
        if (this.onopen) {
            try {
                this.onopen(openEvent);
            } catch (error) {
                console.error('Error in WebSocket onopen handler:', error);
            }
        }

        // Call event listeners
        this.openHandlers.forEach(handler => {
            try {
                handler(openEvent);
            } catch (error) {
                console.error('Error in WebSocket open handler:', error);
            }
        });
    }

    // Simulate receiving a message
    simulateMessage(data: any): void {
        const messageEvent = new MessageEvent('message', {
            data: typeof data === 'string' ? data : JSON.stringify(data)
        });

        // Call legacy handler
        if (this.onmessage) {
            try {
                this.onmessage(messageEvent);
            } catch (error) {
                console.error('Error in WebSocket onmessage handler:', error);
            }
        }

        // Call event listeners
        this.messageHandlers.forEach(handler => {
            try {
                handler(messageEvent);
            } catch (error) {
                console.error('Error in WebSocket message handler:', error);
            }
        });
    }

    // Simulate an error
    simulateError(error?: Error): void {
        const errorEvent = new Event('error');

        // Call legacy handler
        if (this.onerror) {
            try {
                this.onerror(errorEvent);
            } catch (error) {
                console.error('Error in WebSocket onerror handler:', error);
            }
        }

        // Call event listeners
        this.errorHandlers.forEach(handler => {
            try {
                handler(errorEvent);
            } catch (error) {
                console.error('Error in WebSocket error handler:', error);
            }
        });
    }

    // Simulate closing the connection
    simulateClose(code: number = 1000, reason: string = ''): void {
        this.readyStateValue = 2 // CLOSING;
        this.isClosed = true;

        const closeEvent = new CloseEvent('close', { code, reason });

        // Call legacy handler
        if (this.onclose) {
            try {
                this.onclose(closeEvent);
            } catch (error) {
                console.error('Error in WebSocket onclose handler:', error);
            }
        }

        // Call event listeners
        this.closeHandlers.forEach(handler => {
            try {
                handler(closeEvent);
            } catch (error) {
                console.error('Error in WebSocket close handler:', error);
            }
        });

        this.readyStateValue = 3 // CLOSED;
    }

    // Reset the mock for reuse
    reset(): void {
        this.readyStateValue = 0 // CONNECTING;
        this.sentMessages.length = 0;
        this.messageHandlers.clear();
        this.closeHandlers.clear();
        this.errorHandlers.clear();
        this.openHandlers.clear();
        this.isClosed = false;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        this.onopen = null;
    }

    // Get handler counts for testing
    getHandlerCounts(): {
        message: number;
        close: number;
        error: number;
        open: number;
    } {
        return {
            message: this.messageHandlers.size,
            close: this.closeHandlers.size,
            error: this.errorHandlers.size,
            open: this.openHandlers.size,
        };
    }
}

/**
 * Factory function to create a WebSocket mock service
 */
export function createWebSocketMock(url?: string): WebSocketMockService {
    return new WebSocketMockService();
}

/**
 * Mock WebSocket constructor for global mocking
 */
export class MockWebSocketConstructor {
    private static instances: WebSocketMockService[] = [];

    static create(url?: string): WebSocketMockService {
        const mock = new WebSocketMockService();
        this.instances.push(mock);
        return mock;
    }

    static getInstances(): WebSocketMockService[] {
        return [...this.instances];
    }

    static clearInstances(): void {
        this.instances.length = 0;
    }

    static getLastInstance(): WebSocketMockService | undefined {
        return this.instances[this.instances.length - 1];
    }
}
