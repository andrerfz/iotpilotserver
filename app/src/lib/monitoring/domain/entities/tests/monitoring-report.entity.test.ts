import {MonitoringReport, MonitoringReportId, ReportFormat, ReportType} from '../monitoring-report.entity';
import {TimeRange} from '../../value-objects/time-range.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ReportGeneratedEvent} from '../../events/report-generated.event';

describe('MonitoringReportId', () => {
  describe('create', () => {
    it('should create with provided id', () => {
      const reportId = MonitoringReportId.create('report-123');
      expect(reportId.value).toBe('report-123');
    });

    it('should create with generated id if not provided', () => {
      const reportId = MonitoringReportId.create();
      expect(reportId.value).toBeDefined();
      expect(typeof reportId.value).toBe('string');
      expect(reportId.value.length).toBeGreaterThan(0);
    });

    it('should throw error for empty id', () => {
      expect(() => new MonitoringReportId('')).toThrow('Report ID cannot be empty');
    });
  });

  describe('equals', () => {
    it('should return true for equal ids', () => {
      const reportId1 = MonitoringReportId.create('report-123');
      const reportId2 = MonitoringReportId.create('report-123');
      expect(reportId1.equals(reportId2)).toBe(true);
    });

    it('should return false for different ids', () => {
      const reportId1 = MonitoringReportId.create('report-123');
      const reportId2 = MonitoringReportId.create('report-456');
      expect(reportId1.equals(reportId2)).toBe(false);
    });
  });
});

describe('MonitoringReport Entity', () => {
  const mockReportId = MonitoringReportId.create('report-123');
  const mockCustomerId = CustomerId.create('customer-123');
  const mockDeviceId1 = DeviceId.create('device-123');
  const mockDeviceId2 = DeviceId.create('device-456');
  const mockTimeRange = TimeRange.create(
    new Date('2024-01-01T00:00:00Z'),
    new Date('2024-01-01T23:59:59Z')
  );
  const mockParameters = { includeMetrics: true, aggregation: 'hourly' };

  describe('create', () => {
    it('should create a valid monitoring report', () => {
      const report = MonitoringReport.create(
        mockReportId,
        'System Health Report',
        'Daily system health overview',
        'system_health',
        mockTimeRange,
        [mockDeviceId1, mockDeviceId2],
        'pdf',
        'user-123',
        mockParameters,
        mockCustomerId
      );

      expect(report).toBeDefined();
      expect(report.id).toBe(mockReportId);
      expect(report.name).toBe('System Health Report');
      expect(report.description).toBe('Daily system health overview');
      expect(report.type).toBe('system_health');
      expect(report.timeRange).toBe(mockTimeRange);
      expect(report.deviceIds).toEqual([mockDeviceId1, mockDeviceId2]);
      expect(report.format).toBe('pdf');
      expect(report.status).toBe('pending');
      expect(report.url).toBeNull();
      expect(report.error).toBeNull();
      expect(report.createdBy).toBe('user-123');
      expect(report.parameters).toEqual(mockParameters);
      expect(report.getTenantId()).toBe(mockCustomerId);
      expect(report.isPending()).toBe(true);
      expect(report.completedAt).toBeNull();
    });

    it('should throw error for empty name', () => {
      expect(() => {
        new (MonitoringReport as any)(
          mockReportId,
          '',
          'Description',
          'system',
          mockTimeRange,
          [],
          'pdf',
          'pending',
          null,
          null,
          new Date(),
          null,
          'user-123',
          {},
          mockCustomerId
        );
      }).toThrow('Report name cannot be empty');
    });

    it('should throw error for empty type', () => {
      expect(() => {
        new (MonitoringReport as any)(
          mockReportId,
          'Report Name',
          'Description',
          '',
          mockTimeRange,
          [],
          'pdf',
          'pending',
          null,
          null,
          new Date(),
          null,
          'user-123',
          {},
          mockCustomerId
        );
      }).toThrow('Report type cannot be empty');
    });
  });

  describe('status management', () => {
    let report: MonitoringReport;

    beforeEach(() => {
      report = MonitoringReport.create(
        mockReportId,
        'Test Report',
        'Test description',
        'system',
        mockTimeRange,
        [mockDeviceId1],
        'json',
        'user-123',
        mockParameters,
        mockCustomerId
      );
      report.clearEvents();
    });

    describe('markAsGenerating', () => {
      it('should mark pending report as generating', () => {
        expect(report.isPending()).toBe(true);
        
        report.markAsGenerating();
        
        expect(report.isGenerating()).toBe(true);
        expect(report.status).toBe('generating');
      });

      it('should throw error when marking non-pending report as generating', () => {
        report.markAsGenerating();
        
        expect(() => report.markAsGenerating()).toThrow(
          'Cannot mark report as generating from status: generating'
        );
      });
    });

    describe('markAsCompleted', () => {
      it('should mark generating report as completed', () => {
        report.markAsGenerating();
        const testUrl = 'https://example.com/reports/report-123.pdf';
        
        report.markAsCompleted(testUrl);
        
        expect(report.isCompleted()).toBe(true);
        expect(report.status).toBe('completed');
        expect(report.url).toBe(testUrl);
        expect(report.completedAt).toBeDefined();
        expect(report.completedAt).toBeInstanceOf(Date);
        
        // Should emit ReportGeneratedEvent
        const events = report.getEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(ReportGeneratedEvent);
      });

      it('should throw error when marking non-generating report as completed', () => {
        expect(() => report.markAsCompleted('https://example.com/test.pdf')).toThrow(
          'Cannot mark report as completed from status: pending'
        );
      });
    });

    describe('markAsFailed', () => {
      it('should mark generating report as failed', () => {
        report.markAsGenerating();
        const errorMessage = 'Database connection failed';
        
        report.markAsFailed(errorMessage);
        
        expect(report.isFailed()).toBe(true);
        expect(report.status).toBe('failed');
        expect(report.error).toBe(errorMessage);
      });

      it('should mark pending report as failed', () => {
        const errorMessage = 'Invalid parameters';
        
        report.markAsFailed(errorMessage);
        
        expect(report.isFailed()).toBe(true);
        expect(report.status).toBe('failed');
        expect(report.error).toBe(errorMessage);
      });

      it('should throw error when marking completed report as failed', () => {
        report.markAsGenerating();
        report.markAsCompleted('https://example.com/test.pdf');
        
        expect(() => report.markAsFailed('Some error')).toThrow(
          'Cannot mark report as failed from status: completed'
        );
      });
    });
  });

  describe('status predicates', () => {
    let report: MonitoringReport;

    beforeEach(() => {
      report = MonitoringReport.create(
        mockReportId,
        'Test Report',
        'Test description',
        'system',
        mockTimeRange,
        [],
        'csv',
        'user-123',
        {},
        mockCustomerId
      );
    });

    it('should correctly identify pending status', () => {
      expect(report.isPending()).toBe(true);
      expect(report.isGenerating()).toBe(false);
      expect(report.isCompleted()).toBe(false);
      expect(report.isFailed()).toBe(false);
    });

    it('should correctly identify generating status', () => {
      report.markAsGenerating();
      
      expect(report.isPending()).toBe(false);
      expect(report.isGenerating()).toBe(true);
      expect(report.isCompleted()).toBe(false);
      expect(report.isFailed()).toBe(false);
    });

    it('should correctly identify completed status', () => {
      report.markAsGenerating();
      report.markAsCompleted('https://example.com/test.csv');
      
      expect(report.isPending()).toBe(false);
      expect(report.isGenerating()).toBe(false);
      expect(report.isCompleted()).toBe(true);
      expect(report.isFailed()).toBe(false);
    });

    it('should correctly identify failed status', () => {
      report.markAsFailed('Test error');
      
      expect(report.isPending()).toBe(false);
      expect(report.isGenerating()).toBe(false);
      expect(report.isCompleted()).toBe(false);
      expect(report.isFailed()).toBe(true);
    });
  });

  describe('getters and immutability', () => {
    let report: MonitoringReport;

    beforeEach(() => {
      report = MonitoringReport.create(
        mockReportId,
        'Test Report',
        'Test description',
        'device',
        mockTimeRange,
        [mockDeviceId1, mockDeviceId2],
        'html',
        'user-123',
        mockParameters,
        mockCustomerId
      );
    });

    it('should return correct id through getId()', () => {
      expect(report.getId()).toBe(mockReportId);
    });

    it('should return new array for deviceIds', () => {
      const deviceIds = report.deviceIds;
      expect(deviceIds).toEqual([mockDeviceId1, mockDeviceId2]);
      
      // Modify returned array shouldn't affect original
      deviceIds.push(DeviceId.create('new-device'));
      expect(report.deviceIds).toHaveLength(2);
    });

    it('should return new Date instance for createdAt', () => {
      const createdAt = report.createdAt;
      expect(createdAt).toBeInstanceOf(Date);
      
      // Modify returned date shouldn't affect original
      const originalTime = report.createdAt.getTime();
      createdAt.setFullYear(2025);
      expect(report.createdAt.getTime()).toBe(originalTime);
    });

    it('should return new Date instance for completedAt when completed', () => {
      report.markAsGenerating();
      report.markAsCompleted('https://example.com/test.html');
      
      const completedAt = report.completedAt;
      expect(completedAt).toBeInstanceOf(Date);
      
      // Modify returned date shouldn't affect original
      const originalTime = report.completedAt!.getTime();
      completedAt!.setFullYear(2025);
      expect(report.completedAt!.getTime()).toBe(originalTime);
    });

    it('should return null for completedAt when not completed', () => {
      expect(report.completedAt).toBeNull();
    });

    it('should return new parameters object', () => {
      const parameters = report.parameters;
      expect(parameters).toEqual(mockParameters);
      expect(parameters).not.toBe(mockParameters);
      
      // Modify returned parameters shouldn't affect original
      parameters.newProp = 'new value';
      expect(report.parameters.newProp).toBeUndefined();
    });
  });

  describe('report types and formats', () => {
    it.each([
      'system_health', 'system', 'device', 'performance', 'alerts', 'custom'
    ])('should support %s report type', (type) => {
      const report = MonitoringReport.create(
        mockReportId,
        'Test Report',
        'Test description',
        type as ReportType,
        mockTimeRange,
        [],
        'pdf',
        'user-123',
        {},
        mockCustomerId
      );

      expect(report.type).toBe(type);
    });

    it.each([
      'pdf', 'csv', 'json', 'html'
    ])('should support %s report format', (format) => {
      const report = MonitoringReport.create(
        mockReportId,
        'Test Report',
        'Test description',
        'system',
        mockTimeRange,
        [],
        format as ReportFormat,
        'user-123',
        {},
        mockCustomerId
      );

      expect(report.format).toBe(format);
    });
  });

  describe('tenant isolation', () => {
    it('should be tenant-scoped', () => {
      const report = MonitoringReport.create(
        mockReportId,
        'Test Report',
        'Test description',
        'system',
        mockTimeRange,
        [],
        'pdf',
        'user-123',
        {},
        mockCustomerId
      );

      expect(report.getTenantId()).toBe(mockCustomerId);
      expect(report.belongsToTenant(mockCustomerId)).toBe(true);
      expect(report.belongsToTenant(CustomerId.create('other-customer'))).toBe(false);
    });
  });
});