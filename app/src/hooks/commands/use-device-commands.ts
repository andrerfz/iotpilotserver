import {useCommand} from './use-command';
import {RegisterDeviceCommand} from '@/lib/device/application/commands/register-device/register-device.command';
import {UpdateDeviceCommand} from '@/lib/device/application/commands/update-device/update-device.command';
import {RemoveDeviceCommand} from '@/lib/device/application/commands/remove-device/remove-device.command';

/**
 * Result types for device commands
 */
interface DeviceResult {
    id: string;
    hostname: string;
    ipAddress: string;
    status: string;
}

/**
 * A hook for executing device-specific commands via API calls.
 * @returns Functions to execute device commands with loading and error states.
 */
export function useDeviceCommands() {
    const registerCommand = useCommand<RegisterDeviceCommand, DeviceResult>('/api/devices');
    const updateCommand = useCommand<UpdateDeviceCommand, DeviceResult>('/api/devices');
    const removeCommand = useCommand<RemoveDeviceCommand, void>('/api/devices');

    return {
        registerDevice: registerCommand.execute,
        updateDevice: updateCommand.execute,
        removeDevice: removeCommand.execute,
        loading: registerCommand.loading || updateCommand.loading || removeCommand.loading,
        error: registerCommand.error || updateCommand.error || removeCommand.error
    };
}

