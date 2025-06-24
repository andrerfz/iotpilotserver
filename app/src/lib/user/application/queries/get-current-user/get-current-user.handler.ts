import {QueryHandler} from '@/lib/shared/application/interfaces/query.interface';
import {GetCurrentUserQuery} from './get-current-user.query';
import {UserAuthenticator} from '@/lib/user/domain/services/user-authenticator';
import {UserMapper} from '@/lib/user/infrastructure/mappers/user.mapper';
import {SessionExpiredException} from '@/lib/user/domain/exceptions/session-expired.exception';

export class GetCurrentUserHandler implements QueryHandler<GetCurrentUserQuery, any> {
    constructor(
        private readonly userAuthenticator: UserAuthenticator
    ) {}

    async handle(query: GetCurrentUserQuery): Promise<any> {
        const user = await this.userAuthenticator.validateSession(query.token);

        if (!user) {
            throw new SessionExpiredException();
        }

        return UserMapper.toDTO(user);
    }
}