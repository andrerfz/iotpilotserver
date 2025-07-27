import {beforeEach, describe, expect, it, vi} from 'vitest';
import {DockerStatsCollectorService} from '../docker-stats-collector.service';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceMetrics} from '../../../domain/entities/device-metrics.entity';
import {DeviceRepository} from '../../../domain/interfaces/device-repository.interface';
import {SSHClient} from '../../../domain/interfaces/ssh-client.interface';
import {IpAddress} from '../../../domain/value-objects/ip-address.vo';
import {SshCredentials} from '../../../domain/value-objects/ssh-credentials.vo';
import {Port} from '../../../domain/value-objects/port.vo';

// Mock Prisma
const mockPrismaClient = {};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient),
}));

describe('DockerStatsCollectorService', () => {
  let dockerCollector: DockerStatsCollectorService;
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

    dockerCollector = new DockerStatsCollectorService(
      mockPrismaClient as any,
      mockSSHClient,
      mockDeviceRepository
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
      const dockerStatsOutput = `nginx,5.00%,128 MiB / 1 GiB,12.50%,1.25 MB / 2.5 MB,100 MB / 200 MB
redis,2.50%,64 MiB / 512 MiB,12.50%,500 KB / 1 MB,50 MB / 100 MB`;

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
      expect(result.diskUsage).toBeGreaterThan(0);

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
        'docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}"'
      );

      // Verify SSH session was disconnected
      expect(mockSSHClient.disconnect).toHaveBeenCalledWith(mockSession.id);
    });

    it('should throw error when device not found', async () => {
      mockDeviceRepository.findById.mockResolvedValue(null);

      await expect(dockerCollector.collectMetrics(deviceId))
        .rejects.toThrow('Device with ID device-1 not found');

      expect(mockSSHClient.connect).not.toHaveBeenCalled();
    });

    it('should throw error when device has no IP address', async () => {
      const deviceWithoutIP = {
        ...mockDevice,
        ipAddress: { value: null },
      };
      mockDeviceRepository.findById.mockResolvedValue(deviceWithoutIP);

      await expect(dockerCollector.collectMetrics(deviceId))
        .rejects.toThrow('Device with ID device-1 has no IP address');
    });

    it('should handle SSH connection failures', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockSSHClient.connect.mockRejectedValue(new Error('SSH connection failed'));

      await expect(dockerCollector.collectMetrics(deviceId))
        .rejects.toThrow('SSH connection failed');
    });

    it('should handle docker stats command errors', async () => {
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

      await expect(dockerCollector.collectMetrics(deviceId))
        .rejects.toThrow('Error executing docker stats command: docker command not found');

      expect(mockSSHClient.disconnect).toHaveBeenCalledWith(mockSession.id);
    });

    it('should parse single container stats correctly', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const singleContainerOutput = 'web-app,15.50%,256 MiB / 2 GiB,12.80%,5.2 MB / 10.5 MB,1.2 GB / 2.4 GB';
      mockSSHClient.executeCommand.mockResolvedValue({
        output: singleContainerOutput,
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.collectMetrics(deviceId);

      expect(result.cpuUsage).toBeCloseTo(15.5, 1);
      expect(result.memoryUsage).toBeCloseTo(12.8, 1);
      expect(result.diskUsage).toBeGreaterThan(0);
      expect(result.networkUpload).toBeGreaterThan(0);
      expect(result.networkDownload).toBeGreaterThan(0);
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
      expect(result.networkUpload).toBe(0);
      expect(result.networkDownload).toBe(0);
    });

    it('should handle malformed docker stats output', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const malformedOutput = 'invalid,data,format\nanother,invalid,line';
      mockSSHClient.executeCommand.mockResolvedValue({
        output: malformedOutput,
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.collectMetrics(deviceId);

      // Should return default values for malformed data
      expect(result.cpuUsage).toBe(0);
      expect(result.memoryUsage).toBe(0);
    });
  });

  describe('getLatestMetrics', () => {
    it('should delegate to collectMetrics', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const dockerStatsOutput = 'app,10.00%,128 MiB / 1 GiB,12.50%,1 MB / 2 MB,100 MB / 200 MB';
      mockSSHClient.executeCommand.mockResolvedValue({
        output: dockerStatsOutput,
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.getLatestMetrics(deviceId);

      expect(result).toBeInstanceOf(DeviceMetrics);
      expect(result.cpuUsage).toBeCloseTo(10.0, 1);
    });
  });

  describe('isDeviceReachable', () => {
    it('should return true when docker stats collection succeeds', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      mockSSHClient.executeCommand.mockResolvedValue({
        output: 'container,1.00%,64 MiB / 512 MiB,12.50%,100 KB / 200 KB,10 MB / 20 MB',
        error: '',
        exitCode: 0,
      });

      const result = await dockerCollector.isDeviceReachable(deviceId);

      expect(result).toBe(true);
    });

    it('should return false when docker stats collection fails', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);
      mockSSHClient.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await dockerCollector.isDeviceReachable(deviceId);

      expect(result).toBe(false);
    });

    it('should return false when device not found', async () => {
      mockDeviceRepository.findById.mockResolvedValue(null);

      const result = await dockerCollector.isDeviceReachable(deviceId);

      expect(result).toBe(false);
    });
  });

  describe('getMetricsHistory', () => {
    it('should return aggregated metrics over time range', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const dockerStatsOutput = `web,5.00%,64 MiB / 512 MiB,12.50%,500 KB / 1 MB,50 MB / 100 MB
api,10.00%,128 MiB / 1 GiB,12.50%,1 MB / 2 MB,100 MB / 200 MB`;

      mockSSHClient.executeCommand.mockResolvedValue({
        output: dockerStatsOutput,
        error: '',
        exitCode: 0,
      });

      const startTime = new Date('2023-01-01T00:00:00Z');
      const endTime = new Date('2023-01-01T01:00:00Z');

      const result = await dockerCollector.getMetricsHistory(deviceId, startTime, endTime);

      expect(result).toHaveLength(1); // Should aggregate into single metrics entry
      expect(result[0].cpuUsage).toBeCloseTo(7.5, 1); // Average of 5% and 10%
      expect(result[0].memoryUsage).toBeCloseTo(12.5, 1);
    });
  });

  describe('getAverageMetrics', () => {
    it('should calculate average metrics over time range', async () => {
      mockDeviceRepository.findById.mockResolvedValue(mockDevice);

      const mockSession = {
        id: { value: 'session-123' },
        deviceId,
        ipAddress: mockDevice.ipAddress,
        credentials: mockDevice.sshCredentials,
      };
      mockSSHClient.connect.mockResolvedValue(mockSession);

      const dockerStatsOutput = `app1,5.00%,64 MiB / 512 MiB,12.50%,500 KB / 1 MB,50 MB / 100 MB
app2,15.00%,192 MiB / 1 GiB,18.75%,1.5 MB / 2 MB,150 MB / 200 MB`;

      mockSSHClient.executeCommand.mockResolvedValue({
        output: dockerStatsOutput,
        error: '',
        exitCode: 0,
      });

      const startTime = new Date('2023-01-01T00:00:00Z');
      const endTime = new Date('2023-01-01T01:00:00Z');

      const result = await dockerCollector.getAverageMetrics(deviceId, startTime, endTime);

      expect(result.cpuUsage).toBeCloseTo(10.0, 1); // Average of 5% and 15%
      expect(result.memoryUsage).toBeCloseTo(15.625, 1); // Average of 12.5% and 18.75%
      expect(result.diskUsage).toBeGreaterThan(0);
    });

    it('should throw error when no metrics data available', async () => {
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

      const startTime = new Date('2023-01-01T00:00:00Z');
      const endTime = new Date('2023-01-01T01:00:00Z');

      await expect(dockerCollector.getAverageMetrics(deviceId, startTime, endTime))
        .rejects.toThrow('No metrics data available for averaging');
    });
  });

  describe('parseDockerStats', () => {
    it('should parse CPU percentage correctly', () => {
      const collector = dockerCollector as any;
      const stats = collector.parseDockerStats('nginx,15.50%,128 MiB / 1 GiB,12.50%,1.25 MB / 2.5 MB,100 MB / 200 MB');

      expect(stats.cpu).toBe(15.5);
    });

    it('should parse memory usage correctly', () => {
      const collector = dockerCollector as any;
      const stats = collector.parseDockerStats('nginx,15.50%,128 MiB / 1 GiB,12.50%,1.25 MB / 2.5 MB,100 MB / 200 MB');

      expect(stats.memory).toBe(12.5);
    });

    it('should parse network I/O correctly', () => {
      const collector = dockerCollector as any;
      const stats = collector.parseDockerStats('nginx,15.50%,128 MiB / 1 GiB,12.50%,1.25 MB / 2.5 MB,100 MB / 200 MB');

      expect(stats.network?.upload).toBe(1250000); // 1.25 MB in bytes
      expect(stats.network?.download).toBe(2500000); // 2.5 MB in bytes
    });

    it('should parse disk I/O correctly', () => {
      const collector = dockerCollector as any;
      const stats = collector.parseDockerStats('nginx,15.50%,128 MiB / 1 GiB,12.50%,1.25 MB / 2.5 MB,100 MB / 200 MB');

      expect(stats.disk).toBe(50); // 100 MB / 200 MB = 50%
    });

    it('should handle multiple containers and average values', () => {
      const collector = dockerCollector as any;
      const multiContainerOutput = `nginx,10.00%,64 MiB / 512 MiB,12.50%,500 KB / 1 MB,50 MB / 100 MB
redis,20.00%,128 MiB / 1 GiB,12.50%,1 MB / 2 MB,100 MB / 200 MB`;

      const stats = collector.parseDockerStats(multiContainerOutput);

      expect(stats.cpu).toBe(15.0); // Average of 10% and 20%
      expect(stats.memory).toBe(12.5); // Both have 12.5%
      expect(stats.network?.upload).toBe(750000); // Average of 500KB and 1MB
      expect(stats.network?.download).toBe(1500000); // Average of 1MB and 2MB
      expect(stats.disk).toBe(50); // Both have 50%
    });

    it('should handle empty input', () => {
      const collector = dockerCollector as any;
      const stats = collector.parseDockerStats('');

      expect(stats.cpu).toBe(0);
      expect(stats.memory).toBe(0);
      expect(stats.disk).toBe(0);
      expect(stats.network).toBeUndefined();
    });

    it('should handle malformed lines gracefully', () => {
      const collector = dockerCollector as any;
      const stats = collector.parseDockerStats('invalid,line,format\nnginx,10.00%,64 MiB / 512 MiB,12.50%');

      expect(stats.cpu).toBe(0); // No valid lines
      expect(stats.memory).toBe(0);
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

      await expect(dockerCollector.collectMetrics(deviceId)).rejects.toThrow();

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
        output: 'nginx,5.00%,128 MiB / 1 GiB,12.50%,1 MB / 2 MB,100 MB / 200 MB',
        error: '',
        exitCode: 0,
      });

      mockSSHClient.disconnect.mockRejectedValue(new Error('Disconnect failed'));

      // Should not throw due to disconnect error
      await expect(dockerCollector.collectMetrics(deviceId)).resolves.toBeDefined();
    });
  });
});
