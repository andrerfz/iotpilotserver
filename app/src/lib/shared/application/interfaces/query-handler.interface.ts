import {Query} from './query.interface';

export interface QueryHandler<T extends Query<R>, R = any> {
    execute(query: T): Promise<R>;
}