import {vi} from 'vitest';

/**
 * Mock SSH service for testing
 */
export class SshMockService {
    private connected = false;
    private executedCommands: Array<{
        command: string;
        cwd?: string;
        options?: any;
        result?: { stdout: string; stderr: string; code: number };
    }> = [];
    private uploadedFiles: Array<{
        localPath: string;
        remotePath: string;
        options?: any;
    }> = [];
    private downloadedFiles: Array<{
        remotePath: string;
        localPath: string;
        options?: any;
    }> = [];

    // Mock SSH connection methods
    connect = vi.fn().mockImplementation(async (config: any) => {
        this.connected = true;
        return { success: true };
    });

    disconnect = vi.fn().mockImplementation(async () => {
        this.connected = false;
        return { success: true };
    });

    isConnected = vi.fn().mockImplementation(() => {
        return this.connected;
    });

    // Mock command execution
    exec = vi.fn().mockImplementation(async (
        command: string,
        options?: {
            cwd?: string;
            env?: Record<string, string>;
            timeout?: number;
        }
    ) => {
        this.executedCommands.push({
            command,
            cwd: options?.cwd,
            options,
        });

        // Return default successful result
        const result = {
            stdout: `Mock output for: ${command}`,
            stderr: '',
            code: 0
        };

        this.executedCommands[this.executedCommands.length - 1].result = result;
        return result;
    });

    // Mock file operations
    uploadFile = vi.fn().mockImplementation(async (
        localPath: string,
        remotePath: string,
        options?: any
    ) => {
        this.uploadedFiles.push({ localPath, remotePath, options });
        return { success: true };
    });

    downloadFile = vi.fn().mockImplementation(async (
        remotePath: string,
        localPath: string,
        options?: any
    ) => {
        this.downloadedFiles.push({ remotePath, localPath, options });
        return { success: true };
    });

    // Utility methods for testing
    getExecutedCommands(): Array<{
        command: string;
        cwd?: string;
        options?: any;
        result?: { stdout: string; stderr: string; code: number };
    }> {
        return [...this.executedCommands];
    }

    getExecutedCommandCount(): number {
        return this.executedCommands.length;
    }

    getUploadedFiles(): Array<{
        localPath: string;
        remotePath: string;
        options?: any;
    }> {
        return [...this.uploadedFiles];
    }

    getDownloadedFiles(): Array<{
        remotePath: string;
        localPath: string;
        options?: any;
    }> {
        return [...this.downloadedFiles];
    }

    // Configure mock responses for specific commands
    mockCommandResponse(command: string, response: {
        stdout?: string;
        stderr?: string;
        code?: number;
        error?: Error;
    }): void {
        this.exec.mockImplementation(async (cmd: string, options?: any) => {
            if (cmd === command) {
                if (response.error) {
                    throw response.error;
                }
                return {
                    stdout: response.stdout || '',
                    stderr: response.stderr || '',
                    code: response.code || 0
                };
            }

            // Default behavior for other commands
            return {
                stdout: `Mock output for: ${cmd}`,
                stderr: '',
                code: 0
            };
        });
    }

    // Configure mock responses for file operations
    mockUploadFailure(localPath: string, error: Error): void {
        this.uploadFile.mockImplementation(async (local: string, remote: string, options?: any) => {
            if (local === localPath) {
                throw error;
            }
            return { success: true };
        });
    }

    mockDownloadFailure(remotePath: string, error: Error): void {
        this.downloadFile.mockImplementation(async (remote: string, local: string, options?: any) => {
            if (remote === remotePath) {
                throw error;
            }
            return { success: true };
        });
    }

    // Simulate connection failure
    simulateConnectionFailure(): void {
        this.connect.mockRejectedValue(new Error('Connection failed'));
    }

    // Simulate command failure
    simulateCommandFailure(command: string, error: Error): void {
        this.exec.mockImplementation(async (cmd: string, options?: any) => {
            if (cmd === command) {
                throw error;
            }
            return {
                stdout: `Mock output for: ${cmd}`,
                stderr: '',
                code: 0
            };
        });
    }

    // Reset the mock for reuse
    reset(): void {
        this.connected = false;
        this.executedCommands.length = 0;
        this.uploadedFiles.length = 0;
        this.downloadedFiles.length = 0;

        // Reset all mocks
        this.connect.mockReset();
        this.disconnect.mockReset();
        this.isConnected.mockReset();
        this.exec.mockReset();
        this.uploadFile.mockReset();
        this.downloadFile.mockReset();

        // Restore default implementations
        this.connect.mockResolvedValue({ success: true });
        this.disconnect.mockResolvedValue({ success: true });
        this.isConnected.mockReturnValue(false);
        this.exec.mockImplementation(async (command: string, options?: any) => ({
            stdout: `Mock output for: ${command}`,
            stderr: '',
            code: 0
        }));
        this.uploadFile.mockResolvedValue({ success: true });
        this.downloadFile.mockResolvedValue({ success: true });
    }

    clearData(): void {
        this.executedCommands.length = 0;
        this.uploadedFiles.length = 0;
        this.downloadedFiles.length = 0;
    }
}

/**
 * Factory function to create an SSH mock service
 */
export function createSshMock(): SshMockService {
    return new SshMockService();
}

/**
 * Mock SSH client class for import mocking
 */
export class MockSshClient {
    private mockService = new SshMockService();

    async connect(config: any) {
        return this.mockService.connect(config);
    }

    async disconnect() {
        return this.mockService.disconnect();
    }

    isConnected() {
        return this.mockService.isConnected();
    }

    async exec(command: string, options?: any) {
        return this.mockService.exec(command, options);
    }

    async uploadFile(localPath: string, remotePath: string, options?: any) {
        return this.mockService.uploadFile(localPath, remotePath, options);
    }

    async downloadFile(remotePath: string, localPath: string, options?: any) {
        return this.mockService.downloadFile(remotePath, localPath, options);
    }

    // Access to underlying mock for testing
    getMockService(): SshMockService {
        return this.mockService;
    }
}
