export class SourceEventId {
  private constructor(private readonly value: string) {}

  static create(value: string): SourceEventId {
    if (!value?.trim()) throw new Error('SourceEventId cannot be empty');
    return new SourceEventId(value.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SourceEventId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
