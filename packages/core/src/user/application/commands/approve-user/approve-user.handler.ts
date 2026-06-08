import {ApproveUserCommand} from './approve-user.command';
import {UserRepository} from '../../../domain/interfaces/user-repository.interface';
import {UserEntity} from '../../../domain/entities/user.entity';
import {UserId} from '../../../domain/value-objects/user-id.vo';
import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {UserNotFoundException} from '../../../domain/exceptions/user.exception';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {UserUpdatedEvent} from '../../../domain/events/user-updated.event';

export class ApproveUserHandler implements CommandHandler<ApproveUserCommand, UserEntity> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: ApproveUserCommand): Promise<UserEntity> {
    const tenantContext = command.getTenantContext();
    const id = UserId.fromString(command.userId);
    const user = await this.userRepository.findById(id, tenantContext);

    if (!user) {
      throw new UserNotFoundException(id);
    }

    user.activate();
    await this.userRepository.save(user, tenantContext);
    await this.eventBus.publish(new UserUpdatedEvent(user));

    return user;
  }
}
