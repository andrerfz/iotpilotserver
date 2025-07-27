import {useCallback, useState} from 'react';
import {useCommand} from '@/hooks/commands/use-command';
import {
    ExecuteSshCommandCommand
} from '@/lib/device/application/commands/execute-ssh-command/execute-ssh-command.command';

/**
 * A hook for managing SSH terminal sessions with a device.
 * @param deviceId The ID of the device to establish an SSH session with.
 * @returns An object with functions to send SSH commands, session state, and output.
 */
export function useSshSession(deviceId: string) {
    const executeSshCommand = useCommand<ExecuteSshCommandCommand, any>(`/api/devices/${deviceId}/ssh`);
    const [output, setOutput] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    const sendCommand = useCallback(async (commandText: string) => {
        try {
            // Send command data - the API route will create the command with tenantContext
            const commandData = { deviceId, command: commandText } as any;
            await executeSshCommand.execute(commandData);
            // Assuming the command execution returns output or updates a state
            // For now, we'll simulate adding output (this should be updated based on actual API response)
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

