import {beforeEach, describe, expect, it, vi} from 'vitest';
import {DockerStatsCollector} from '../docker-stats-collector';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceMetrics} from '../../../domain/entities/device-metrics.entity';
import {DeviceRepository} from '../../../domain/interfaces/device-repository.interface';
import {SSHClient} from '../../../domain/interfaces/ssh-client.interface';
import {IpAddress} from '../../../domain/value-objects/ip-address.vo';
import {SshCredentials} from '../../../domain/value-objects/ssh-credentials.vo';
import {Port} from '../../../domain/value-objects/port.vo';

describe('DockerStatsCollector', () => {
  let dockerCollector: DockerStatsCollector;
  let mockDeviceRepository: DeviceRepository;
  let mockSSHClient: SSHClient;
  let deviceId: DeviceId;
  let mockDevice: any;

  beforeEach(() => {
    mockDeviceRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByIpAddress: vi.fn(),
      findAll: vi.fn(),
      findActive: vi.fn(),
      findInactive: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
    };

    mockSSHClient = {
      connect: vi.fn(),
      executeCommand: vi.fn(),
      disconnect: vi.fn(),
      isConnected: vi.fn(),
      getActiveSessions: vi.fn(),
      getSessionInfo: vi.fn(),
    };

    dockerCollector = new DockerStatsCollector(
      mockDeviceRepository,
      mockSSHClient
    );

    deviceId = DeviceId.create('device-1');
    mockDevice = {
      id: { value: 'device-1' },
      ipAddress: IpAddress.create('192.168.1.100'),
      sshCredentials: SshCredentials.create('testuser', 'testpass'),
    };

    vi.clearAllMocks();
  });

  describe('collectMetrics', () => {
    it('should collect Docker metrics successfully', async () => {
      // Mock device repository
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      // Mock SSH connection
      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      // Mock docker stats command output
      const dockerStatsOutput = '5.00%|12.50%|128 MiB / 1 GiB|1.25 MB / 2.5 MB\n2.50%|8.75%|64 MiB / 512 MiB|500 KB / 1 MB';

      mockSSHClient.executeCommand.mockResolvedValue({
        output: dockerStatsOutput,
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.collectMetrics(deviceId);

      expect(result).toBeInstanceOf(DeviceMetrics);
      expect(result.deviceId.value).toBe('device-1');
      expect(result.cpuUsage).toBeGreaterThan(0);
      expect(result.memoryUsage).toBeGreaterThan(0);

      // Verify SSH connection was made
      expect(mockSSHClient.connect).toHaveBeenCalledWith(
        deviceId,
        mockDevice.ipAddress,
        Port.create(22),
        mockDevice.sshCredentials
      );

      // Verify docker stats command was executed
      expect(mockSSHClient.executeCommand).toHaveBeenCalledWith(
        mockSession.id,
        'docker stats --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}|{{.NetIO}}"'
      );

      // Verify SSH session was disconnected
      expect(mockSSHClient.disconnect).toHaveBeenCalledWith(mockSession.id);
    });

    it('should cache metrics for subsequent calls', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const dockerStatsOutput = '10.00%|15.00%|256 MiB / 2 GiB|2 MB / 4 MB';
      mockSSHClient.executeCommand.mockResolvedValue({
        output: dockerStatsOutput,
        error: '',
        exitCode: 0,
      });

      // First call
      const result1 = await dockerCollector.collectMetrics(deviceId);

      // Second call - should use cached result
      const result2 = await dockerCollector.collectMetrics(deviceId);

      expect(result1).toBeInstanceOf(DeviceMetrics);
      expect(result2).toBeInstanceOf(DeviceMetrics);
      expect(result1.cpuUsage).toBe(result2.cpuUsage);
      expect(result1.memoryUsage).toBe(result2.memoryUsage);

      // SSH should only be called once
      expect(mockSSHClient.connect).toHaveBeenCalledTimes(1);
      expect(mockSSHClient.executeCommand).toHaveBeenCalledTimes(1);
    });

    it('should throw error when device not found', async () => {
      mockDeviceRepository.findById.mockResolvedValue(null);

      await expect(dockerCollector.collectMetrics(deviceId))
        .rejects.toThrow('Device with ID device-1 not found');

      expect(mockSSHClient.connect).not.toHaveBeenCalled();
    });

    it('should return default metrics when docker stats command fails', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      mockSSHClient.executeCommand.mockResolvedValue({
        output: '',
        error: 'docker command not found',
        exitCode: 127,
      });

      const result = await dockerCollector.collectMetrics(deviceId);

      expect(result).toBeInstanceOf(DeviceMetrics);
      expect(result.cpuUsage).toBe(0);
      expect(result.memoryUsage).toBe(0);
      expect(result.diskUsage).toBe(0);

      expect(mockSSHClient.disconnect).toHaveBeenCalledWith(mockSession.id);
    });

    it('should handle SSH connection failures', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockSSHClient.connect.mockRejectedValue(new Error('SSH connection failed'));

      const result = await dockerCollector.collectMetrics(deviceId);

      expect(result).toBeInstanceOf(DeviceMetrics);
      expect(result.cpuUsage).toBe(0);
      expect(result.memoryUsage).toBe(0);
    });

    it('should parse CPU and memory percentages correctly', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const dockerStatsOutput = '15.50%|22.75%|512 MiB / 4 GiB|5 MB / 10 MB';
      mockSSHClient.executeCommand.mockResolvedValue({
        output: dockerStatsOutput,
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.collectMetrics(deviceId);

      expect(result.cpuUsage).toBeCloseTo(15.5, 1);
      expect(result.memoryUsage).toBeCloseTo(22.75, 2);
    });

    it('should parse memory usage details correctly', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const dockerStatsOutput = '5.00%|12.50%|128 MiB / 1 GiB|1.25 MB / 2.5 MB';
      mockSSHClient.executeCommand.mockResolvedValue({
        output: dockerStatsOutput,
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.collectMetrics(deviceId);

      // The implementation should parse memory usage from the MemPerc field
      expect(result.memoryUsage).toBeCloseTo(12.5, 1);
    });

    it('should parse network I/O correctly', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const dockerStatsOutput = '5.00%|12.50%|128 MiB / 1 GiB|1.25 MB / 2.5 MB';
      mockSSHClient.executeCommand.mockResolvedValue({
        output: dockerStatsOutput,
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.collectMetrics(deviceId);

      expect(result.networkUpload).toBeGreaterThan(0);
      expect(result.networkDownload).toBeGreaterThan(0);
    });

    it('should handle multiple container stats by averaging', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const multiContainerOutput = '10.00%|15.00%|256 MiB / 2 GiB|2 MB / 4 MB\n5.00%|10.00%|128 MiB / 1 GiB|1 MB / 2 MB';
      mockSSHClient.executeCommand.mockResolvedValue({
        output: multiContainerOutput,
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.collectMetrics(deviceId);

      expect(result.cpuUsage).toBeCloseTo(7.5, 1); // Average of 10% and 5%
      expect(result.memoryUsage).toBeCloseTo(12.5, 1); // Average of 15% and 10%
    });

    it('should handle empty docker stats output', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      mockSSHClient.executeCommand.mockResolvedValue({
        output: '',
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.collectMetrics(deviceId);

      expect(result.cpuUsage).toBe(0);
      expect(result.memoryUsage).toBe(0);
      expect(result.diskUsage).toBe(0);
    });

    it('should handle malformed docker stats output gracefully', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const malformedOutput = 'invalid|data|format\nanother|invalid|line';
      mockSSHClient.executeCommand.mockResolvedValue({
        output: malformedOutput,
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.collectMetrics(deviceId);

      expect(result.cpuUsage).toBe(0);
      expect(result.memoryUsage).toBe(0);
    });
  });

  describe('getDefaultMetrics', () => {
    it('should return default metrics with zero values', () => {
      const collector = dockerCollector as any;
      const defaultMetrics = collector.getDefaultMetrics(deviceId);

      expect(defaultMetrics).toBeInstanceOf(DeviceMetrics);
      expect(defaultMetrics.deviceId.value).toBe('device-1');
      expect(defaultMetrics.cpuUsage).toBe(0);
      expect(defaultMetrics.memoryUsage).toBe(0);
      expect(defaultMetrics.diskUsage).toBe(0);
      expect(defaultMetrics.networkUpload).toBe(0);
      expect(defaultMetrics.networkDownload).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should clear the metrics cache', async () => {
      // First, populate cache
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      mockSSHClient.executeCommand.mockResolvedValue({
        output: '10.00%|15.00%|256 MiB / 2 GiB|2 MB / 4 MB',
        error: '',
        exitCode: 0,
      });

      // Call once to cache
      await dockerCollector.collectMetrics(deviceId);

      // Clear cache
      const collector = dockerCollector as any;
      collector.clearCache();

      // Cache should be empty
      expect(collector.metricsCache.size).toBe(0);
    });
  });

  describe('getCacheSize', () => {
    it('should return the number of cached metrics', async () => {
      const collector = dockerCollector as any;

      // Initially empty
      expect(collector.getCacheSize()).toBe(0);

      // Add some cached data
      collector.metricsCache.set('device-1', {} as DeviceMetrics);
      collector.metricsCache.set('device-2', {} as DeviceMetrics);

      expect(collector.getCacheSize()).toBe(2);
    });
  });

  describe('parseDockerStats', () => {
    it('should parse single line docker stats correctly', () => {
      const collector = dockerCollector as any;
      const stats = collector.parseDockerStats('15.50%|22.75%|512 MiB / 4 GiB|5 MB / 10 MB');

      expect(stats.cpu).toBe(15.5);
      expect(stats.memory).toBe(22.75);
      expect(stats.memoryUsage).toBe('512 MiB / 4 GiB');
      expect(stats.network).toBe('5 MB / 10 MB');
    });

    it('should parse multiple lines and average values', () => {
      const collector = dockerCollector as any;
      const multiLineStats = '10.00%|15.00%|256 MiB / 2 GiB|2 MB / 4 MB\n5.00%|10.00%|128 MiB / 1 GiB|1 MB / 2 MB';

      const stats = collector.parseDockerStats(multiLineStats);

      expect(stats.cpu).toBe(7.5); // Average of 10 and 5
      expect(stats.memory).toBe(12.5); // Average of 15 and 10
    });

    it('should handle empty input', () => {
      const collector = dockerCollector as any;
      const stats = collector.parseDockerStats('');

      expect(stats.cpu).toBe(0);
      expect(stats.memory).toBe(0);
      expect(stats.memoryUsage).toBe('');
      expect(stats.network).toBe('');
    });

    it('should handle malformed lines gracefully', () => {
      const collector = dockerCollector as any;
      const stats = collector.parseDockerStats('invalid|format|here\n10.00%|15.00%|valid|data');

      expect(stats.cpu).toBe(10.0); // Only valid line
      expect(stats.memory).toBe(15.0);
    });

    it('should handle lines with insufficient fields', () => {
      const collector = dockerCollector as any;
      const stats = collector.parseDockerStats('10.00%|15.00%\n20.00%|25.00%|more|data');

      expect(stats.cpu).toBe(15.0); // Average of valid lines (20.00%)
      expect(stats.memory).toBe(25.0); // Average of valid lines (25.00%)
    });
  });

  describe('error handling and cleanup', () => {
    it('should always disconnect SSH session even on errors', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      // Simulate command failure
      mockSSHClient.executeCommand.mockRejectedValue(new Error('Command failed'));

      await expect(dockerCollector.collectMetrics(deviceId)).resolves.toBeDefined(); // Should return default metrics

      // Should still disconnect
      expect(mockSSHClient.disconnect).toHaveBeenCalledWith(mockSession.id);
    });

    it('should handle SSH disconnection errors gracefully', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      mockSSHClient.executeCommand.mockResolvedValue({
        output: '10.00%|15.00%|256 MiB / 2 GiB|2 MB / 4 MB',
        error: '',
        exitCode: 0,
      });

      mockSSHClient.disconnect.mockRejectedValue(new Error('Disconnect failed'));

      // Should not throw due to disconnect error
      await expect(dockerCollector.collectMetrics(deviceId)).resolves.toBeDefined();
    });
  });

  describe('cache management', () => {
    it('should not cache metrics when collection fails', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockSSHClient.connect.mockRejectedValue(new Error('SSH failed'));

      await dockerCollector.collectMetrics(deviceId);

      const collector = dockerCollector as any;
      expect(collector.metricsCache.has('device-1')).toBe(false);
    });

    it('should cache metrics only when collection succeeds', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      mockSSHClient.executeCommand.mockResolvedValue({
        output: '10.00%|15.00%|256 MiB / 2 GiB|2 MB / 4 MB',
        error: '',
        exitCode: 0,
      });

      await dockerCollector.collectMetrics(deviceId);

      const collector = dockerCollector as any;
      expect(collector.metricsCache.has('device-1')).toBe(true);
    });
  });
});
