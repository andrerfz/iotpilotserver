import {ValueObjectInterface} from './interfaces/value-object.interface';

export abstract class ValueObject<T> implements ValueObjectInterface {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  equals(other: ValueObjectInterface): boolean {
    if (Object.is(this, other)) return true;
    
    // Handle null and undefined
    if (other === null || other === undefined) return false;
    
    if (this.constructor !== other.constructor) return false;

    if (!(other instanceof ValueObject)) return false;
    
    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON());
  }

  abstract toJSON(): T;
}
