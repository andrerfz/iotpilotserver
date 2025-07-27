import {Command} from '@/lib/shared/domain/command';

/**
 * Public registration DTO used by the frontend to call `/api/auth/register`.
 * This is intentionally NOT tenant-aware; the server will derive tenant/customer.
 */
export class PublicRegisterUserCommand extends Command {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly password: string
  ) {
    super();
  }
}


