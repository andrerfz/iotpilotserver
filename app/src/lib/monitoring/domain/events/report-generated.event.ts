import {DomainEventBase} from '@/lib/shared/domain/events/domain.event';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ReportType} from '../entities/monitoring-report.entity';

/**
 * Event raised when a monitoring report is generated
 */
export class ReportGeneratedEvent extends DomainEventBase {
  constructor(
    public readonly reportType: ReportType,
    public readonly tenantId: CustomerId,
    public readonly deviceId?: any
  ) {
    super();
  }

  getName(): string {
    return 'ReportGenerated';
  }

  getTenantId(): string | null {
    return this.tenantId.getValue();
  }
}