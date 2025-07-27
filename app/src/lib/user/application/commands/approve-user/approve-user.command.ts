import {Command} from '@/lib/shared/domain/command';

export class ApproveUserCommand extends Command {
    constructor(public readonly userId: string) {
        super();
    }
}


