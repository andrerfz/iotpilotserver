import {vi} from 'vitest';
import {createRedisMock, RedisMockService} from './mocks/redis-mock.service';
import {createMqttMock, MqttMockService} from './mocks/mqtt-mock.service';
import {createWebSocketMock, WebSocketMockService} from './mocks/websocket-mock.service';
import {createSshMock, SshMockService} from './mocks/ssh-mock.service';

/**
 * Mock builder utility for setting up external service mocks in tests
 */
export class MockBuilder {
    private mocks: {
        redis?: RedisMockService;
        mqtt?: MqttMockService;
        websocket?: WebSocketMockService;
        ssh?: SshMockService;
    } = {};

    private moduleMocks: Set<string> = new Set();

    /**
     * Create a Redis mock
     */
    withRedis(): MockBuilder {
        this.mocks.redis = createRedisMock();
        return this;
    }

    /**
     * Create an MQTT mock
     */
    withMqtt(): MockBuilder {
        this.mocks.mqtt = createMqttMock();
        return this;
    }

    /**
     * Create a WebSocket mock
     */
    withWebSocket(): MockBuilder {
        this.mocks.websocket = createWebSocketMock();
        return this;
    }

    /**
     * Create an SSH mock
     */
    withSsh(): MockBuilder {
        this.mocks.ssh = createSshMock();
        return this;
    }

    /**
     * Mock a specific module import
     */
    mockModule(modulePath: string, mockImplementation: any): MockBuilder {
        vi.mock(modulePath, () => mockImplementation);
        this.moduleMocks.add(modulePath);
        return this;
    }

    /**
     * Mock common external service modules
     */
    mockExternalServices(): MockBuilder {
        // Mock Redis
        if (this.mocks.redis) {
            this.mockModule('ioredis', () => ({
                default: vi.fn().mockImplementation(() => this.mocks.redis),
                Redis: vi.fn().mockImplementation(() => this.mocks.redis),
            }));
        }

        // Mock MQTT
        if (this.mocks.mqtt) {
            this.mockModule('mqtt', () => ({
                connect: vi.fn().mockReturnValue(this.mocks.mqtt),
                Client: vi.fn().mockImplementation(() => this.mocks.mqtt),
            }));
        }

        // Mock WebSocket
        if (this.mocks.websocket) {
            this.mockModule('ws', () => ({
                WebSocket: vi.fn().mockImplementation(() => this.mocks.websocket),
                default: { WebSocket: vi.fn().mockImplementation(() => this.mocks.websocket) },
            }));

            // Also mock global WebSocket
            global.WebSocket = vi.fn().mockImplementation(() => this.mocks.websocket) as any;
        }

        // Mock SSH
        if (this.mocks.ssh) {
            this.mockModule('node-ssh', () => ({
                NodeSSH: vi.fn().mockImplementation(() => ({
                    connect: this.mocks.ssh!.connect,
                    exec: this.mocks.ssh!.exec,
                    putFile: this.mocks.ssh!.uploadFile,
                    getFile: this.mocks.ssh!.downloadFile,
                    dispose: this.mocks.ssh!.disconnect,
                })),
            }));
        }

        return this;
    }

    /**
     * Configure mock responses for common scenarios
     */
    configureDefaults(): MockBuilder {
        // Configure Redis defaults
        if (this.mocks.redis) {
            // Set up some default session data
            this.mocks.redis.set('session:test-session-id', JSON.stringify({
                userId: 'test-user-id',
                customerId: 'test-customer-id',
                role: 'USER',
                expiresAt: Date.now() + 3600000, // 1 hour from now
            }));
        }

        // Configure MQTT defaults
        if (this.mocks.mqtt) {
            // Auto-connect MQTT
            this.mocks.mqtt.connect();
        }

        // Configure WebSocket defaults
        if (this.mocks.websocket) {
            // Auto-open WebSocket connection after a short delay
            setTimeout(() => {
                if (this.mocks.websocket) {
                    this.mocks.websocket.simulateOpen();
                }
            }, 10);
        }

        return this;
    }

    /**
     * Build and return the mock services
     */
    build(): {
        redis?: RedisMockService;
        mqtt?: MqttMockService;
        websocket?: WebSocketMockService;
        ssh?: SshMockService;
        restoreAll: () => void;
    } {
        const restoreAll = () => {
            // Clear mock data
            if (this.mocks.redis) this.mocks.redis.clearData();
            if (this.mocks.mqtt) this.mocks.mqtt.clearData();
            if (this.mocks.websocket) this.mocks.websocket.reset();
            if (this.mocks.ssh) this.mocks.ssh.reset();

            // Restore module mocks
            vi.restoreAllMocks();
            this.moduleMocks.clear();

            // Restore global mocks
            if (this.mocks.websocket) {
                global.WebSocket = WebSocket;
            }
        };

        return {
            redis: this.mocks.redis,
            mqtt: this.mocks.mqtt,
            websocket: this.mocks.websocket,
            ssh: this.mocks.ssh,
            restoreAll,
        };
    }
}

/**
 * Quick setup function for common test scenarios
 */
export function setupTestMocks(options: {
    redis?: boolean;
    mqtt?: boolean;
    websocket?: boolean;
    ssh?: boolean;
    mockModules?: boolean;
    configureDefaults?: boolean;
} = {}) {
    const builder = new MockBuilder();

    if (options.redis !== false) builder.withRedis();
    if (options.mqtt !== false) builder.withMqtt();
    if (options.websocket !== false) builder.withWebSocket();
    if (options.ssh !== false) builder.withSsh();

    if (options.mockModules !== false) {
        builder.mockExternalServices();
    }

    if (options.configureDefaults !== false) {
        builder.configureDefaults();
    }

    return builder.build();
}

/**
 * Utility to create mock instances directly
 */
export const mockServices = {
    redis: createRedisMock,
    mqtt: createMqttMock,
    websocket: createWebSocketMock,
    ssh: createSshMock,
};
