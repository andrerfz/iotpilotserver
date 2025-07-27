import {useCommand} from './use-command';
import {CreateAlertCommand} from '@/lib/monitoring/application/commands/create-alert/create-alert.command';
import {
    AcknowledgeAlertCommand
} from '@/lib/monitoring/application/commands/acknowledge-alert/acknowledge-alert.command';
import {ResolveAlertCommand} from '@/lib/monitoring/application/commands/resolve-alert/resolve-alert.command';

/**
 * Result types for monitoring commands
 */
interface AlertResult {
    id: string;
    deviceId: string;
    severity: string;
    status: string;
}

/**
 * A hook for executing monitoring-specific commands via API calls.
 * @returns Functions to execute monitoring commands with loading and error states.
 */
export function useMonitoringCommands() {
    const createAlertCommand = useCommand<CreateAlertCommand, AlertResult>('/api/monitoring/alerts');
    const acknowledgeAlertCommand = useCommand<AcknowledgeAlertCommand, AlertResult>('/api/monitoring/alerts');
    const resolveAlertCommand = useCommand<ResolveAlertCommand, AlertResult>('/api/monitoring/alerts');

    return {
        createAlert: createAlertCommand.execute,
        acknowledgeAlert: acknowledgeAlertCommand.execute,
        resolveAlert: resolveAlertCommand.execute,
        loading: createAlertCommand.loading || acknowledgeAlertCommand.loading || resolveAlertCommand.loading,
        error: createAlertCommand.error || acknowledgeAlertCommand.error || resolveAlertCommand.error
    };
}

