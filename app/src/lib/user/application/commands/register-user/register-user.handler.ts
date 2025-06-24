import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {RegisterUserCommand} from './register-user.command';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {PasswordHasher} from '@/lib/user/domain/services/password-hasher';
import {Email} from '@/lib/user/domain/value-objects/email.vo';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {UserRole} from '@/lib/user/domain/value-objects/user-role.vo';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {User} from '@/lib/user/domain/entities/user.entity';
import {EmailAlreadyExistsException} from '@/lib/user/domain/exceptions/email-already-exists.exception';
import {EventBus} from '@/lib/shared/application/bus/event.bus';
import {UserRegisteredEvent} from '@/lib/user/domain/events/user-registered.event';

export class RegisterUserHandler implements CommandHandler<RegisterUserCommand> {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: PasswordHasher,
        private readonly eventBus: EventBus
    ) {}

    async handle(command: RegisterUserCommand): Promise<void> {
        // Check if email already exists
        const emailExists = await this.userRepository.emailExists(command.email);
        if (emailExists) {
            throw new EmailAlreadyExistsException(command.email.getValue());
        }

        // Hash password
        const hashedPassword = await this.passwordHasher.hash(command.password);

        // Create user
        const userId = UserId.generate();
        const user = User.create(userId, command.email, hashedPassword, command.role);

        // Save user
        await this.userRepository.save(user);

        // Publish event
        await this.eventBus.publish(new UserRegisteredEvent(
            userId.getValue(),
            command.email.getValue()
        ));
    }
}
