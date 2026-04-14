import {useCallback, useState} from 'react';
import {useCommand} from '@/hooks/commands/use-command';

interface SshCommandPayload {
    deviceId: string;
    command: string;
    [key: string]: unknown;
}

export function useSshSession(deviceId: string) {
    const executeSshCommand = useCommand<SshCommandPayload, unknown>(`/api/devices/${deviceId}/ssh`);
    const [output, setOutput] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    const sendCommand = useCallback(async (commandText: string) => {
        try {
            const commandData: SshCommandPayload = { deviceId, command: commandText };
            await executeSshCommand.execute(commandData);
            setOutput(prev => [...prev, `$ ${commandText}`, 'Response: Command executed']);
            setIsConnected(true);
        } catch (error) {
            setOutput(prev => [...prev, `$ ${commandText}`, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
            setIsConnected(false);
        }
    }, [deviceId, executeSshCommand]);

    const clearOutput = useCallback(() => {
        setOutput([]);
    }, []);

    return {
        sendCommand,
        output,
        clearOutput,
        isConnected,
        loading: executeSshCommand.loading,
        error: executeSshCommand.error
    };
}
