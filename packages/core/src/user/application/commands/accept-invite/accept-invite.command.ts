import {Command} from '@iotpilot/core/shared/application/interfaces/command.interface';

/**
 * Not tenant-aware: this runs unauthenticated, driven purely by a token from
 * an emailed link — there is no caller identity or tenant context yet.
 */
export class AcceptInviteCommand implements Command {
  static readonly type = 'AcceptInviteCommand';

  constructor(
    public readonly token: string,
    public readonly password: string,
  ) {}
}
