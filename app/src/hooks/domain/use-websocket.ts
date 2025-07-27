import {useCallback, useEffect, useState} from 'react';

/**
 * A hook for managing WebSocket connections.
 * @param url The WebSocket server URL to connect to.
 * @returns An object with connection status, message handling, and send functionality.
 */
export function useWebSocket(url: string) {
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let websocket: WebSocket;
        try {
            websocket = new WebSocket(url);
            setWs(websocket);
            setError(null);

            websocket.onopen = () => {
                setIsConnected(true);
                setError(null);
            };

            websocket.onmessage = (event) => {
                setLastMessage(event.data);
            };

            websocket.onerror = (event) => {
                setError('WebSocket error occurred.');
                console.error('WebSocket error:', event);
            };

            websocket.onclose = () => {
                setIsConnected(false);
                setWs(null);
            };
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to initialize WebSocket.');
        }

        return () => {
            if (websocket) {
                websocket.close();
                setWs(null);
                setIsConnected(false);
            }
        };
    }, [url]);

    const sendMessage = useCallback((message: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            return true;
        }
        setError('WebSocket is not connected.');
        return false;
    }, [ws]);

    return {
        isConnected,
        lastMessage,
        sendMessage,
        error
    };
}

