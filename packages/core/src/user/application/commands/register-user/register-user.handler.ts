import {RegisterUserCommand} from './register-user.command';
import {UserRepository} from '../../../domain/interfaces/user-repository.interface';
import {UserEntity} from '../../../domain/entities/user.entity';
import {Email} from '../../../domain/value-objects/email.vo';
import {Password} from '../../../domain/value-objects/password.vo';
import {UserRole} from '../../../../shared/domain/value-objects/user-role.vo';
import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {InvalidEmailException, UserAlreadyExistsException} from '../../../domain/exceptions/user.exception';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import {PasswordHasher} from '../../../domain/services/password-hasher';

export class RegisterUserHandler implements CommandHandler<RegisterUserCommand, UserEntity> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly logger: StructuredLogger
  ) {}

  async handle(command: RegisterUserCommand): Promise<UserEntity> {
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role
    } = command;
    const tenantContext = command.getTenantContext();

    // Validate tenant context
    if (!tenantContext) {
      throw new Error('Tenant context is required for user registration');
    }

    const customerId = tenantContext.getCustomerId();
    if (!customerId) {
      throw new Error('Customer ID not found in tenant context');
    }

    // Validate role permissions
    const requestedRole = role ? UserRole.fromString(role) : UserRole.fromString('USER');

    // Only SUPERADMIN can create other SUPERADMINs
    if (requestedRole.isSuperAdmin() && !tenantContext.isSuperAdmin()) {
      throw new Error('Only SUPERADMIN can create SUPERADMIN users');
    }

    // Check if user already exists
    const existingUserEmail = Email.fromString(email);
    const existingUser = await this.userRepository.findByEmail(existingUserEmail, tenantContext);

    if (existingUser) {
      throw new UserAlreadyExistsException(existingUserEmail);
    }

    // Hash password with bcrypt before creating the entity
    const passwordVo = Password.create(password);
    const hashedPassword = await this.passwordHasher.hash(passwordVo);

    // Create user using entity factory method with the real bcrypt hash
    const user = UserEntity.createFromRegistration(
      email,
      hashedPassword,
      firstName,
      lastName,
      customerId,
      requestedRole
    );

    // Set additional properties
    if (phoneNumber) {
      user.updateProfile(undefined, undefined, phoneNumber);
    }

    // Validate user belongs to tenant
    user.validateBelongsToTenant(customerId);

    // Save user
    await this.userRepository.save(user, tenantContext);

    this.logger.info('User registered successfully', {
      userId: user.getId().getValue(),
      email: user.getEmail().getValue(),
      role: user.getRole().getValue(),
      customerId: customerId.getValue(),
      registeredBy: tenantContext.getUserId()?.getValue() || 'system',
      fullName: user.getFullName()
    });

    return user;
  }
}
