import {CommandHandler} from '@/lib/shared/application/interfaces/command.interface';
import {RegisterUserCommand} from './register-user.command';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {PasswordHasher} from '@/lib/user/domain/services/password-hasher';
import {User} from '@/lib/user/domain/entities/user.entity';
import {Password} from '@/lib/user/domain/value-objects/password.vo';
import {EventBus} from '@/lib/shared/application/bus/event.bus';

export class RegisterUserHandler implements CommandHandler<RegisterUserCommand> {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: PasswordHasher,
        private readonly eventBus: EventBus
    ) {}

    async handle(command: RegisterUserCommand): Promise<void> {
        // Check if user already exists
        const existingUser = command.customerId
            ? await this.userRepository.findByEmailInTenant(command.email, command.customerId)
            : await this.userRepository.findByEmail(command.email);

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await this.passwordHasher.hash(command.password);
        const passwordWithHash = Password.create(hashedPassword);

        // Create user
        const user = User.create(
            command.email,
            passwordWithHash,
            command.role,
            command.customerId,
            command.username
        );

        // Save user
        await this.userRepository.save(user);

        // Publish domain events
        await this.eventBus.publishAll(user.getEvents());
        user.clearEvents();
    }
}
