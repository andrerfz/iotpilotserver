import {Command} from '@/lib/shared/domain/command';
import {CreateUserDto} from '@/lib/user/application/dtos/create-user.dto';

export class CreateUserCommand extends Command {
    constructor(public readonly createUserDto: CreateUserDto) {
        super();
    }
}
