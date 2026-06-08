import {useCallback, useState} from 'react';
import {useCommand} from './use-command';
import { apiUrl } from '@/utils/api-url';

interface RegisterDevicePayload {
    hostname: string;
    deviceId: string;
    deviceType: string;
    ipAddress?: string;
    [key: string]: unknown;
}

interface UpdateDevicePayload {
    hostname?: string;
    ipAddress?: string;
    tailscaleIp?: string;
    description?: string;
    location?: string;
    [key: string]: unknown;
}

interface DeviceResult {
    id: string;
    hostname: string;
    ipAddress: string;
    status: string;
}

export interface RegenerateTokenResult {
    claimingToken: string;
    expiresAt: string;
}

export function useDeviceCommands() {
    const registerCommand = useCommand<RegisterDevicePayload, DeviceResult>('/api/devices');

    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [removeLoading, setRemoveLoading] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);
    const [sendCommandLoading, setSendCommandLoading] = useState(false);
    const [sendCommandError, setSendCommandError] = useState<string | null>(null);
    const [regenerateTokenLoading, setRegenerateTokenLoading] = useState(false);

    // PUT /api/devices/{publicId}
    const updateDevice = useCallback(async (publicId: string, payload: UpdateDevicePayload): Promise<DeviceResult | null> => {
        setUpdateLoading(true);
        setUpdateError(null);
        try {
            const res = await fetch(apiUrl(`/api/devices/${publicId}`), {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Update failed: ${res.status}`);
            const body = await res.json();
            return (body.data ?? body) as DeviceResult;
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to update device';
            setUpdateError(msg);
            return null;
        } finally {
            setUpdateLoading(false);
        }
    }, []);

    // DELETE /api/devices/{publicId}
    const removeDevice = useCallback(async (publicId: string): Promise<void> => {
        setRemoveLoading(true);
        setRemoveError(null);
        try {
            const res = await fetch(apiUrl(`/api/devices/${publicId}`), {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to remove device';
            setRemoveError(msg);
            throw new Error(msg);
        } finally {
            setRemoveLoading(false);
        }
    }, []);

    // POST /api/devices/{deviceId}/commands
    const sendCommand = useCallback(async (deviceId: string, command: string): Promise<void> => {
        setSendCommandLoading(true);
        setSendCommandError(null);
        try {
            const res = await fetch(apiUrl(`/api/devices/${deviceId}/commands`), {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({command}),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({error: 'Request failed'}));
                throw new Error(data.error || `Command failed: ${res.status}`);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to send command';
            setSendCommandError(msg);
            throw new Error(msg);
        } finally {
            setSendCommandLoading(false);
        }
    }, []);

    // POST /api/devices/claim — regenerate claiming token for PENDING_SETUP devices
    const regenerateToken = useCallback(async (deviceId: string, hostname: string): Promise<RegenerateTokenResult | null> => {
        setRegenerateTokenLoading(true);
        try {
            const res = await fetch(apiUrl('/api/devices/claim'), {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({deviceId, name: hostname}),
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Failed to regenerate token');
            return result.data as RegenerateTokenResult;
        } catch {
            return null;
        } finally {
            setRegenerateTokenLoading(false);
        }
    }, []);

    return {
        registerDevice: registerCommand.execute,
        updateDevice,
        removeDevice,
        sendCommand,
        sendCommandLoading,
        regenerateToken,
        regenerateTokenLoading,
        loading: registerCommand.loading || updateLoading || removeLoading,
        error: registerCommand.error || updateError || removeError || sendCommandError,
    };
}
