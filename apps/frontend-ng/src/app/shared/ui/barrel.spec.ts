import { describe, it, expect } from 'vitest';

/**
 * Barrel + import lint rule (fe-ui-kit T1)
 *
 * These tests verify:
 * 1. The barrel exports the expected Ionic tokens.
 * 2. The ESLint no-restricted-imports rule rejects @ionic/angular in feature code.
 */

describe('shared/ui barrel', () => {
  it('exports core Ionic tokens', async () => {
    const barrel = await import('./index');
    expect(barrel.IonButton).toBeDefined();
    expect(barrel.IonCard).toBeDefined();
    expect(barrel.IonModal).toBeDefined();
    expect(barrel.IonSpinner).toBeDefined();
    expect(barrel.IonIcon).toBeDefined();
    expect(barrel.IonList).toBeDefined();
    expect(barrel.IonSplitPane).toBeDefined();
    expect(barrel.IonMenu).toBeDefined();
    expect(barrel.IonContent).toBeDefined();
  }, 30000);

  it('exports navigation tokens', async () => {
    const barrel = await import('./index');
    expect(barrel.IonHeader).toBeDefined();
    expect(barrel.IonToolbar).toBeDefined();
    expect(barrel.IonBreadcrumbs).toBeDefined();
    expect(barrel.IonSearchbar).toBeDefined();
  });

  it('exports chip and segment tokens', async () => {
    const barrel = await import('./index');
    expect(barrel.IonChip).toBeDefined();
    expect(barrel.IonSegment).toBeDefined();
    expect(barrel.IonSegmentButton).toBeDefined();
    expect(barrel.IonAccordion).toBeDefined();
  });
});

describe('shared/ui barrel — ESLint import restriction', () => {
  // process.cwd() in the container is /app/apps/frontend-ng (set by EXEC_NG).
  // eslint.config.js lives there, so ESLint's flat-config loader finds it.
  const pkgRoot = process.cwd();
  const code = `import { IonButton } from '@ionic/angular/standalone';`;

  it('rejects @ionic/angular imports in feature files via no-restricted-imports rule', async () => {
    const { ESLint } = await import('eslint');
    const eslint = new ESLint({ cwd: pkgRoot });
    const featureFixture = pkgRoot + '/src/app/features/__lint_fixture__.ts';
    const results = await eslint.lintText(code, { filePath: featureFixture });

    const ionicErrors = results[0]?.messages.filter(
      (m) => m.ruleId === 'no-restricted-imports',
    );
    expect(ionicErrors?.length).toBeGreaterThan(0);
  }, 30000);

  it('allows @ionic/angular imports in shared/ui files', async () => {
    const { ESLint } = await import('eslint');
    const eslint = new ESLint({ cwd: pkgRoot });
    const uiFixture = pkgRoot + '/src/app/shared/ui/__lint_fixture__.ts';
    const results = await eslint.lintText(code, { filePath: uiFixture });

    const ionicErrors = results[0]?.messages.filter(
      (m) => m.ruleId === 'no-restricted-imports',
    );
    expect(ionicErrors?.length).toBe(0);
  });
});
