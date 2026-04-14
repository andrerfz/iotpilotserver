/// <reference types="node" />
import {exec} from 'child_process';
import {promisify} from 'util';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import {DeviceRepository} from '../../domain/interfaces/device.repository';
import {DeviceId} from '../../domain/value-objects/device-id.vo';

const execAsync = promisify(exec);

/**
 * Device capabilities interface
 */
export interface DeviceCapabilities {
    protocols: string[];
    commands: string[];
    features: string[];
    restrictions?: string[];
    ssh?: {
        supported: boolean;
        port?: number;
        auth_methods?: string[];
    };
    mqtt?: {
        supported: boolean;
        broker_required?: boolean;
        topics?: string[];
    };
}

/**
 * Device Capability Detector Service
 * Detects device capabilities based on device type and connectivity
 */
export class DeviceCapabilityDetectorService {
    private readonly logger = StructuredLogger.forService('device-capability-detector');

    /**
     * Detect device capabilities based on device type and initial connection
     */
    async detectCapabilities(device: {
        deviceType: string;
        architecture: string;
        deviceModel?: string;
        ipAddress?: string;
        tailscaleIp?: string;
    }): Promise<DeviceCapabilities> {
        const capabilities: DeviceCapabilities = {
            protocols: [],
            commands: [],
            features: [],
            restrictions: []
        };

        // Base capabilities by device type
        switch (device.deviceType) {
            case 'PI_ZERO':
                capabilities.protocols = ['ssh'];
                capabilities.commands = ['status', 'restart', 'reboot', 'update'];
                capabilities.features = ['monitoring', 'logging'];
                capabilities.restrictions = ['limited_resources'];
                capabilities.ssh = {
                    supported: true,
                    port: 22,
                    auth_methods: ['password', 'key']
                };
                break;

            case 'PI_3':
            case 'PI_4':
            case 'PI_5':
                capabilities.protocols = ['ssh', 'mqtt', 'http'];
                capabilities.commands = ['status', 'restart', 'reboot', 'update', 'ps', 'top', 'df'];
                capabilities.features = ['monitoring', 'logging', 'remote_access'];
                capabilities.ssh = {
                    supported: true,
                    port: 22,
                    auth_methods: ['password', 'key']
                };
                capabilities.mqtt = {
                    supported: true,
                    broker_required: false
                };
                break;

            case 'ORANGE_PI':
                capabilities.protocols = ['ssh', 'http'];
                capabilities.commands = ['status', 'restart', 'reboot', 'update'];
                capabilities.features = ['monitoring', 'logging'];
                capabilities.ssh = {
                    supported: true,
                    port: 22,
                    auth_methods: ['password', 'key']
                };
                break;

            case 'GENERIC':
                // Conservative capabilities for unknown devices
                capabilities.protocols = ['ssh'];
                capabilities.commands = ['status'];
                capabilities.features = ['monitoring'];
                capabilities.restrictions = ['read_only'];
                capabilities.ssh = {
                    supported: true,
                    port: 22,
                    auth_methods: ['password']
                };
                break;

            default:
                // Minimal capabilities for unknown devices
                capabilities.protocols = [];
                capabilities.commands = ['status'];
                capabilities.features = [];
                capabilities.restrictions = ['read_only'];
                break;
        }

        // Test actual connectivity if IP available
        if (device.ipAddress || device.tailscaleIp) {
            const sshAvailable = await this.testSSHConnectivity(device);
            if (!sshAvailable) {
                capabilities.ssh = {supported: false};
                capabilities.protocols = capabilities.protocols.filter(p => p !== 'ssh');
            }
        }

        return capabilities;
    }

    /**
     * Test SSH connectivity to determine if SSH is actually available
     */
    private async testSSHConnectivity(device: {
        ipAddress?: string;
        tailscaleIp?: string;
    }): Promise<boolean> {
        const host = device.tailscaleIp || device.ipAddress;
        if (!host) return false;

        try {
            // Test if SSH port is open (timeout after 5 seconds)
            await execAsync(`timeout 5 bash -c "echo >/dev/tcp/${host}/22"`, {
                timeout: 6000
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Update device capabilities after successful command execution
     */
    async updateCapabilitiesFromExecution(
        deviceRepository: DeviceRepository,
        deviceId: DeviceId,
        command: string,
        protocol: string,
        success: boolean
    ): Promise<void> {
        // Get current device
        const device = await deviceRepository.findById(deviceId);
        if (!device) return;

        const capabilities = this.getDeviceCapabilities(device);

        if (success) {
            // Add successful command to capabilities
            if (!capabilities.commands.includes(command)) {
                capabilities.commands.push(command);
            }

            // Add successful protocol
            if (!capabilities.protocols.includes(protocol)) {
                capabilities.protocols.push(protocol);
            }
        } else {
            // Remove failed command from capabilities
            capabilities.commands = capabilities.commands.filter(c => c !== command);

            // If this was the only way to use this protocol, mark it as unsupported
            if (protocol === 'ssh' && !capabilities.commands.some(c =>
                ['restart', 'reboot', 'update', 'status'].includes(c))) {
                capabilities.ssh = {supported: false};
            }
        }

        // Update device with new capabilities
        // Note: This requires updating the device entity's capabilities
        // The device entity should have a method to update capabilities
        // For now, we'll need to use the repository's save method
        // This is a limitation - we should add an updateCapabilities method to DeviceEntity
        const deviceWithUpdatedCapabilities = device as any;
        deviceWithUpdatedCapabilities.capabilities = capabilities;
        await deviceRepository.save(deviceWithUpdatedCapabilities);
    }

    /**
     * Helper function to get device capabilities
     */
    private getDeviceCapabilities(device: any): DeviceCapabilities {
        try {
            return device.capabilities || {
                protocols: [],
                commands: [],
                features: []
            };
        } catch {
            return {
                protocols: [],
                commands: [],
                features: []
            };
        }
    }
}

// Export singleton instance for convenience
export const DeviceCapabilityDetector = new DeviceCapabilityDetectorService();

