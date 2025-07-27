import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useWebSocket} from '@/hooks/domain/use-websocket';

describe('useWebSocket Hook', () => {
    let mockWebSocket: any;
    let mockWebSocketConstructor: any;

    beforeEach(() => {
        // Create mock WebSocket
        mockWebSocket = {
            send: vi.fn(),
            close: vi.fn(),
            readyState: WebSocket.CONNECTING,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };

        // Mock WebSocket constructor
        mockWebSocketConstructor = vi.fn(() => mockWebSocket);
        global.WebSocket = mockWebSocketConstructor as any;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize WebSocket connection', () => {
        const testUrl = 'ws://localhost:8080/test';
        
        renderHook(() => useWebSocket(testUrl));

        expect(mockWebSocketConstructor).toHaveBeenCalledWith(testUrl);
    });

    it('should set isConnected to true when connection opens', async () => {
        const testUrl = 'ws://localhost:8080/test';
        
        const { result } = renderHook(() => useWebSocket(testUrl));

        // Initially not connected
        expect(result.current.isConnected).toBe(false);

        // Simulate connection opening
        mockWebSocket.readyState = WebSocket.OPEN;
        if (mockWebSocket.onopen) {
            mockWebSocket.onopen(new Event('open'));
        }

        await waitFor(() => {
            expect(result.current.isConnected).toBe(true);
        });
    });

    it('should handle incoming messages', async () => {
        const testUrl = 'ws://localhost:8080/test';
        const testMessage = 'test message';
        
        const { result } = renderHook(() => useWebSocket(testUrl));

        // Simulate receiving a message
        if (mockWebSocket.onmessage) {
            mockWebSocket.onmessage({ data: testMessage });
        }

        await waitFor(() => {
            expect(result.current.lastMessage).toBe(testMessage);
        });
    });

    it('should send messages when connected', () => {
        const testUrl = 'ws://localhost:8080/test';
        const testMessage = 'hello';
        
        mockWebSocket.readyState = WebSocket.OPEN;
        const { result } = renderHook(() => useWebSocket(testUrl));

        const success = result.current.sendMessage(testMessage);

        expect(success).toBe(true);
        expect(mockWebSocket.send).toHaveBeenCalledWith(testMessage);
    });

    it('should not send messages when disconnected', async () => {
        const testUrl = 'ws://localhost:8080/test';
        const testMessage = 'hello';
        
        const { result } = renderHook(() => useWebSocket(testUrl));

        // Simulate connection close
        mockWebSocket.readyState = WebSocket.CLOSED;
        if (mockWebSocket.onclose) {
            mockWebSocket.onclose(new Event('close'));
        }

        await waitFor(() => {
            expect(result.current.isConnected).toBe(false);
        });

        const success = result.current.sendMessage(testMessage);

        expect(success).toBe(false);
        expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
        const testUrl = 'ws://localhost:8080/test';
        
        const { result } = renderHook(() => useWebSocket(testUrl));

        // Simulate error
        if (mockWebSocket.onerror) {
            mockWebSocket.onerror(new Event('error'));
        }

        await waitFor(() => {
            expect(result.current.error).toBeTruthy();
        });
    });

    it('should clean up connection on unmount', () => {
        const testUrl = 'ws://localhost:8080/test';
        
        const { unmount } = renderHook(() => useWebSocket(testUrl));

        unmount();

        expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should handle close event', async () => {
        const testUrl = 'ws://localhost:8080/test';
        
        const { result } = renderHook(() => useWebSocket(testUrl));

        // Open connection first
        mockWebSocket.readyState = WebSocket.OPEN;
        if (mockWebSocket.onopen) {
            mockWebSocket.onopen(new Event('open'));
        }

        await waitFor(() => {
            expect(result.current.isConnected).toBe(true);
        });

        // Simulate close
        mockWebSocket.readyState = WebSocket.CLOSED;
        if (mockWebSocket.onclose) {
            mockWebSocket.onclose(new Event('close'));
        }

        await waitFor(() => {
            expect(result.current.isConnected).toBe(false);
        });
    });

    it('should reconnect when URL changes', () => {
        const url1 = 'ws://localhost:8080/test1';
        const url2 = 'ws://localhost:8080/test2';
        
        const { rerender } = renderHook(
            ({ url }) => useWebSocket(url),
            { initialProps: { url: url1 } }
        );

        expect(mockWebSocketConstructor).toHaveBeenCalledWith(url1);
        expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1);

        // Change URL
        rerender({ url: url2 });

        expect(mockWebSocket.close).toHaveBeenCalled();
        expect(mockWebSocketConstructor).toHaveBeenCalledWith(url2);
        expect(mockWebSocketConstructor).toHaveBeenCalledTimes(2);
    });
});

