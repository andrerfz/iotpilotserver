import {Command} from '@iotpilot/core/shared/domain/command';

export class ApproveUserCommand extends Command {
    constructor(public readonly userId: string) {
        super();
    }
}


