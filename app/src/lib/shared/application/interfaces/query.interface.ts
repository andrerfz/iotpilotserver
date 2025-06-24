export interface Query<R = any> {
}

export interface QueryHandler<T extends Query<R>, R = any> {
    handle(query: T): Promise<R>;
}