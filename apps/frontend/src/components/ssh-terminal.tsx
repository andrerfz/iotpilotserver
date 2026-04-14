'use client';

import {useState} from 'react';
import {useSshSession} from '@/hooks/domain/use-ssh-session';
import {Button, Input} from '@/components/ui';

interface SshTerminalProps {
    deviceId: string;
}

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
            <form onSubmit={handleCommandSubmit} className="terminal-input-form flex gap-2 mt-2">
                <Input
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Enter command..."
                    disabled={!isConnected || loading}
                    className="flex-1"
                />
                <Button type="submit" disabled={!isConnected || loading} color="primary">
                    Send
                </Button>
                <Button type="button" onClick={clearOutput} variant="flat">
                    Clear
                </Button>
            </form>
        </div>
    );
}

export default SshTerminal;
