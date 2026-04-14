import {Command} from '@iotpilot/core/shared/domain/command';
import {CreateUserDto} from '@iotpilot/core/user/application/dtos/create-user.dto';

export class CreateUserCommand extends Command {
    constructor(public readonly createUserDto: CreateUserDto) {
        super();
    }
}
