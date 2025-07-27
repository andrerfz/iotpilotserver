'use client';

import {useState} from 'react';
import {useSshSession} from '@/hooks/domain/use-ssh-session';

interface SshTerminalProps {
    deviceId: string;
}

/**
 * SshTerminal component for interacting with a device via SSH.
 * @param props The component props including deviceId.
 * @returns JSX element for the SSH terminal interface.
 */
export function SshTerminal({ deviceId }: SshTerminalProps) {
    const { sendCommand, output, clearOutput, isConnected, loading, error } = useSshSession(deviceId);
    const [command, setCommand] = useState('');

    const handleCommandSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (command.trim()) {
            sendCommand(command);
            setCommand('');
        }
    };

    return (
        <div className="ssh-terminal">
            <h3>SSH Terminal {isConnected ? '(Connected)' : '(Disconnected)'}</h3>
            {error && <div className="error">Error: {error}</div>}
            {loading && <div>Executing command...</div>}
            <div className="terminal-output">
                {output.map((line, index) => (
                    <div key={index} className="terminal-line">{line}</div>
                ))}
            </div>
            <form onSubmit={handleCommandSubmit} className="terminal-input-form">
                <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Enter command..."
                    disabled={!isConnected || loading}
                    className="terminal-input"
                />
                <button type="submit" disabled={!isConnected || loading}>Send</button>
                <button type="button" onClick={clearOutput}>Clear</button>
            </form>
        </div>
    );
}

export default SshTerminal;
