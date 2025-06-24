export interface ValueObjectInterface {
    equals(other: ValueObjectInterface): boolean;
}

export abstract class ValueObject implements ValueObjectInterface {
    abstract equals(other: ValueObjectInterface): boolean;
}