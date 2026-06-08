type StepFn = (examples: Record<string, string>) => Promise<void>;

export class StepRegistry {
  private steps = new Map<string, StepFn>();

  register(pattern: string, fn: StepFn): void {
    this.steps.set(pattern, fn);
  }

  async execute(stepText: string, examples: Record<string, string>): Promise<void> {
    for (const [pattern, fn] of this.steps) {
      const regex = new RegExp('^' + pattern.replace(/<[^>]+>/g, '(.+)') + '$');
      const match = stepText.match(regex);
      if (match) {
        await fn(examples);
        return;
      }
    }
    throw new Error(`No step handler registered for: "${stepText}"`);
  }
}
