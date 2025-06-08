'use client';

import {useEffect, useRef, useState} from 'react';
import {AlertTriangle, Maximize, Minimize, RefreshCw, Terminal as TerminalIcon, X} from 'lucide-react';
import {
    getEnvironmentInfo,
    getLimit,
    getWebSocketTimeout,
    getWebSocketUrl,
    isDevelopment,
    isFeatureEnabled
} from '@/lib/env';
import {Badge, Button, Card, CardBody, Chip} from '@heroui/react';

interface SSHTerminalProps {
    deviceId: string;
    hostname: string;
    onClose: () => void;
}

export default function SSHTerminal({
    deviceId,
    hostname,
    onClose
}: SSHTerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const socketRef = useRef<WebSocket | null>(null);
    const terminalInstanceRef = useRef<any>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    // Environment configuration
    const wsTimeout = getWebSocketTimeout();
    const maxSSHConnections = getLimit('ssh');
    const envInfo = getEnvironmentInfo();

    // Check if SSH feature is enabled
    if (!isFeatureEnabled('sshTerminal')) {
        return (
            <Card className="bg-default-900 text-center">
                <CardBody className="p-6">
                    <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4"/>
                    <h3 className="text-white text-lg font-medium mb-2">SSH Terminal Disabled</h3>
                    <p className="text-default-400 mb-4">
                        SSH terminal feature is not available in the {envInfo.name} environment.
                    </p>
                    <Button
                        onClick={onClose}
                        color="default"
                        variant="flat"
                    >
                        Close
                    </Button>
                </CardBody>
            </Card>
        );
    }

    // Initialize Terminal
    useEffect(() => {
        const initializeTerminal = async () => {
            try {
                // Dynamically import the terminal library
                const {Terminal} = await import('xterm');
                const {FitAddon} = await import('xterm-addon-fit');
                const {WebLinksAddon} = await import('xterm-addon-web-links');

                // Create terminal instance with environment-aware config
                const terminal = new Terminal({
                    cursorBlink: true,
                    cursorStyle: 'bar',
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    fontSize: isDevelopment() ? 12 : 14, // Smaller font in dev
                    theme: {
                        background: '#1e1e1e',
                        foreground: '#f8f8f8',
                        cursor: '#f8f8f8',
                        selectionBackground: '#3b3b3b',
                    },
                    // Environment-specific settings
                    scrollback: isDevelopment() ? 1000 : 10000,
                    allowTransparency: false,
                });

                // Add fit addon
                const fitAddon = new FitAddon();
                terminal.loadAddon(fitAddon);

                // Add web links addon
                const webLinksAddon = new WebLinksAddon();
                terminal.loadAddon(webLinksAddon);

                // Store references
                terminalInstanceRef.current = terminal;

                // Open terminal
                if (terminalRef.current) {
                    terminal.open(terminalRef.current);
                    fitAddon.fit();

                    // Connect to WebSocket
                    connectWebSocket(terminal);

                    // Resize handler
                    const handleResize = () => {
                        try {
                            fitAddon.fit();
                            // Send dimensions to server if connected
                            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                                const {
                                    rows,
                                    cols
                                } = terminal;
                                socketRef.current.send(JSON.stringify({
                                    type: 'resize',
                                    rows,
                                    cols
                                }));
                            }
                        } catch (err) {
                            console.error('Error resizing terminal:', err);
                        }
                    };

                    // Register resize event listener
                    window.addEventListener('resize', handleResize);

                    // Return cleanup function
                    return () => {
                        window.removeEventListener('resize', handleResize);
                        terminal.dispose();
                        if (socketRef.current) {
                            socketRef.current.close();
                        }
                        if (reconnectTimeoutRef.current) {
                            clearTimeout(reconnectTimeoutRef.current);
                        }
                    };
                }
            } catch (err) {
                console.error('Error initializing terminal:', err);
                setError('Failed to initialize terminal. Please try again.');
            }
        };

        initializeTerminal();
    }, [deviceId]);

    // Connect to WebSocket with environment configuration
    const connectWebSocket = (terminal: any) => {
        setSocketStatus('connecting');
        setError(null);

        try {
            // Create WebSocket connection with environment-specific URL
            const wsUrl = getWebSocketUrl(`/api/devices/${deviceId}/terminal`);
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            // Set up connection timeout
            const connectionTimeout = setTimeout(() => {
                if (socket.readyState === WebSocket.CONNECTING) {
                    socket.close();
                    setError(`Connection timeout after ${wsTimeout / 1000}s`);
                    setSocketStatus('disconnected');
                }
            }, wsTimeout);

            // Connection opened
            socket.addEventListener('open', () => {
                clearTimeout(connectionTimeout);
                setSocketStatus('connected');
                setConnected(true);
                setError(null);
                setReconnectAttempts(0);

                // Initial resize
                const {
                    rows,
                    cols
                } = terminal;
                socket.send(JSON.stringify({
                    type: 'resize',
                    rows,
                    cols
                }));

                // Welcome message with environment info
                terminal.writeln('\r\n\x1b[1;32m Welcome to IoT Pilot Terminal! \x1b[0m');
                terminal.writeln(`\r\n\x1b[1;34m Connected to: \x1b[0m${hostname} (${deviceId})`);

                if (isDevelopment()) {
                    terminal.writeln(`\r\n\x1b[1;33m Environment: ${envInfo.name} \x1b[0m`);
                    terminal.writeln(`\r\n\x1b[1;33m WebSocket: ${wsUrl} \x1b[0m`);
                }

                terminal.writeln('\r\n\x1b[1;33m Type commands to interact with the device.\x1b[0m\r\n');
            });

            // Handle incoming messages
            socket.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'output') {
                        terminal.write(data.data);
                    } else if (data.type === 'error') {
                        terminal.writeln(`\r\n\x1b[1;31mError: ${data.message}\x1b[0m\r\n`);
                    } else if (data.type === 'limit_reached') {
                        terminal.writeln(`\r\n\x1b[1;33mWarning: SSH connection limit reached (${maxSSHConnections})\x1b[0m\r\n`);
                    }
                } catch (err) {
                    // If not JSON, treat as raw output
                    terminal.write(event.data);
                }
            });

            // Handle errors
            socket.addEventListener('error', (event) => {
                clearTimeout(connectionTimeout);
                console.error('WebSocket error:', event);
                setSocketStatus('disconnected');
                setConnected(false);
                setError('Connection error. Attempting to reconnect...');

                terminal.writeln('\r\n\x1b[1;31mConnection error. Attempting to reconnect...\x1b[0m\r\n');

                // Auto-reconnect with exponential backoff
                attemptReconnect(terminal);
            });

            // Connection closed
            socket.addEventListener('close', (event) => {
                clearTimeout(connectionTimeout);
                setSocketStatus('disconnected');
                setConnected(false);

                if (event.wasClean) {
                    terminal.writeln('\r\n\x1b[1;33mConnection closed.\x1b[0m\r\n');
                } else {
                    terminal.writeln('\r\n\x1b[1;31mConnection lost. Attempting to reconnect...\x1b[0m\r\n');
                    attemptReconnect(terminal);
                }
            });

            // Send user input to server
            terminal.onData((data: string) => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'input',
                        data
                    }));
                }
            });

        } catch (err) {
            console.error('Error creating WebSocket:', err);
            setError('Failed to create connection. Please try again.');
            setSocketStatus('disconnected');
        }
    };

    // Auto-reconnect with exponential backoff
    const attemptReconnect = (terminal: any) => {
        if (reconnectAttempts >= 5) {
            setError('Maximum reconnection attempts reached. Please refresh the page.');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30s
        setReconnectAttempts(prev => prev + 1);

        reconnectTimeoutRef.current = setTimeout(() => {
            if (terminalInstanceRef.current) {
                connectWebSocket(terminal);
            }
        }, delay);
    };

    // Manual reconnect
    const handleReconnect = () => {
        if (socketRef.current) {
            socketRef.current.close();
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        setReconnectAttempts(0);

        if (terminalInstanceRef.current) {
            connectWebSocket(terminalInstanceRef.current);
        }
    };

    // Toggle fullscreen
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);

        // Resize terminal after state update
        setTimeout(() => {
            if (terminalInstanceRef.current) {
                const fitAddon = terminalInstanceRef.current._addonManager?._addons?.get?.('fit-addon');
                if (fitAddon) {
                    fitAddon.fit();
                }
            }
        }, 10);
    };

    return (
        <div className={`
      bg-gray-900 rounded-lg overflow-hidden shadow-lg transition-all duration-300 flex flex-col
      ${isFullscreen ? 'fixed inset-0 z-50' : 'h-96'}
    `}>
            {/* Terminal Header */}
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center">
                    <TerminalIcon className="w-5 h-5 text-green-400 mr-2"/>
                    <span className="text-white font-mono text-sm">
            {hostname} - Terminal
          </span>
                    {isDevelopment() && (
                        <Chip size="sm" color="primary" variant="flat" className="ml-2">
                            {envInfo.name}
                        </Chip>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        onClick={handleReconnect}
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="default"
                        title="Reconnect"
                        isDisabled={socketStatus === 'connecting'}
                    >
                        <RefreshCw className={`w-4 h-4 ${socketStatus === 'connecting' ? 'animate-spin' : ''}`}/>
                    </Button>
                    <Button
                        onClick={toggleFullscreen}
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="default"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? (
                            <Minimize className="w-4 h-4"/>
                        ) : (
                            <Maximize className="w-4 h-4"/>
                        )}
                    </Button>
                    <Button
                        onClick={onClose}
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        title="Close"
                    >
                        <X className="w-4 h-4"/>
                    </Button>
                </div>
            </div>

            {/* Status Bar */}
            <div
                className="bg-default-800 px-4 py-1 border-t border-default-700 flex items-center justify-between text-xs">
                <div className="flex items-center">
                    <Badge
                        color={
                            socketStatus === 'connected' ? 'success' :
                                socketStatus === 'connecting' ? 'warning' : 'danger'
                        }
                        variant="flat"
                        size="sm"
                        className="mr-2 w-2 h-2 min-w-unit-2 p-0 rounded-full"
                    >
                        &nbsp;
                    </Badge>
                    <span className="text-default-300">
                        {socketStatus === 'connected' ? 'Connected' :
                            socketStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                    </span>
                    {reconnectAttempts > 0 && (
                        <Chip size="sm" color="warning" variant="flat" className="ml-2">
                            Attempt {reconnectAttempts}/5
                        </Chip>
                    )}
                </div>
                <div className="flex items-center space-x-4 text-default-400">
                    <span>
                        Timeout: {wsTimeout / 1000}s
                    </span>
                    <span>
                        Limit: {maxSSHConnections}
                    </span>
                    <span>
                        {deviceId}
                    </span>
                </div>
            </div>

            {/* Terminal Container */}
            <div
                ref={terminalRef}
                className="flex-grow bg-gray-900 p-1 overflow-hidden"
            />

            {/* Error Message */}
            {error && (
                <div className="bg-danger-900 text-white text-sm px-4 py-2 flex items-center justify-between">
                    <span>{error}</span>
                    {socketStatus === 'disconnected' && (
                        <Button
                            onClick={handleReconnect}
                            size="sm"
                            color="danger"
                            variant="flat"
                        >
                            Retry
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
