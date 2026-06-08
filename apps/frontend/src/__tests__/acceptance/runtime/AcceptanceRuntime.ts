import { describe, it } from 'vitest';
import { StepRegistry } from './StepRegistry';

export interface Scenario {
  name: string;
  steps: string[];
  examples: Record<string, string>[];
}

export function runScenarios(
  featureName: string,
  scenarios: Scenario[],
  registry: StepRegistry,
): void {
  describe(featureName, () => {
    for (const scenario of scenarios) {
      for (const example of scenario.examples) {
        const label = Object.entries(example)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        it(`${scenario.name} [${label}]`, async () => {
          for (const step of scenario.steps) {
            const interpolated = step.replace(
              /<([^>]+)>/g,
              (_, key) => example[key] ?? `<${key}>`,
            );
            await registry.execute(interpolated, example);
          }
        });
      }
    }
  });
}
