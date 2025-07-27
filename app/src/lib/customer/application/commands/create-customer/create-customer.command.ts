import {TenantAwareCommand} from '@/lib/shared/application/commands/tenant-aware-command';
import {TenantContext} from '@/lib/shared/domain/tenant-context';

export class CreateCustomerCommand extends TenantAwareCommand {
  /** Static type identifier that survives minification */
  static readonly type = 'CreateCustomerCommand';

  constructor(
    tenantContext: TenantContext,
    public readonly name: string,
    public readonly description?: string,
    public readonly contactEmail?: string
  ) {
    super(tenantContext);
  }

  static create(
    name: string,
    tenantContext: TenantContext,
    description?: string,
    contactEmail?: string
  ): CreateCustomerCommand {
    if (!name || name.trim().length === 0) {
      throw new Error('Customer name is required');
    }

    return new CreateCustomerCommand(tenantContext, name, description, contactEmail);
  }

  static fromRequest(request: any, tenantContext: TenantContext): CreateCustomerCommand {
    const { name, description, contactEmail } = request.body;

    return CreateCustomerCommand.create(name, tenantContext, description, contactEmail);
  }
}
