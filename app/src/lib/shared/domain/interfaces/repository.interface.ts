export interface Repository<T, ID> {
    findById(id: ID): Promise<T | null>;

    findAll(): Promise<T[]>;

    save(entity: T): Promise<void>;

    delete(id: ID): Promise<void>;
}