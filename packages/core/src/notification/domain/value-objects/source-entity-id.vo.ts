export class SourceEntityId {
  private constructor(private readonly value: string) {}

  static create(value: string): SourceEntityId {
    if (!value?.trim()) throw new Error('SourceEntityId cannot be empty');
    return new SourceEntityId(value.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SourceEntityId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
