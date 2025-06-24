import {QueryHandler} from '@/lib/shared/application/interfaces/query.interface';
import {GetCurrentUserQuery} from './get-current-user.query';
import {UserRepository} from '@/lib/user/domain/interfaces/user-repository.interface';
import {User} from '@/lib/user/domain/entities/user.entity';

export class GetCurrentUserHandler implements QueryHandler<GetCurrentUserQuery> {
    constructor(
        private readonly userRepository: UserRepository
    ) {}

    async handle(query: GetCurrentUserQuery): Promise<User | null> {
        const user = await this.userRepository.findById(query.userId);

        if (!user) {
            return null;
        }

        // Validate tenant access
        if (query.customerId && !user.isSuperAdmin()) {
            if (!user.belongsToTenant(query.customerId)) {
                return null; // User doesn't belong to requested tenant
            }
        }

        return user;
    }
}
