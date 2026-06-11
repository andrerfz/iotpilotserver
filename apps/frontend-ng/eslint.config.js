// @ts-check
// Flat ESLint config for frontend-ng (ESLint 9 / angular-eslint 20).
// Formatting is owned by Prettier (repo defaults) — this config carries no
// stylistic rules, so eslint-config-prettier is unnecessary (nothing to disable).
const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser = require('@angular-eslint/template-parser');

module.exports = [
  {
    ignores: ['node_modules/', 'www/', 'dist/', 'coverage/', '.angular/', 'src/app/core/api/generated/'],
  },
  {
    // Enforce the shared/ui barrel: feature code must never import @ionic directly.
    // The UI layer (shared/ui/, shell/, app.component.ts) is exempted below.
    files: ['src/app/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@ionic/angular', '@ionic/angular/*'],
              message:
                "Import Ionic via the shared/ui barrel: import from 'src/app/shared/ui' instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // UI layer is allowed to import Ionic directly (it IS the barrel).
    files: [
      'src/app/shared/ui/**/*.ts',
      'src/app/shell/**/*.ts',
      'src/app/app.component.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    // Lints templates embedded in `@Component({ template: '...' })`.
    processor: angularTemplate.processors['extract-inline-html'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@angular-eslint': angular,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs['eslint-recommended'].overrides[0].rules,
      ...tsPlugin.configs.recommended.rules,
      ...angular.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/component-class-suffix': [
        'error',
        { suffixes: ['Page', 'Component'] },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
    },
  },
  {
    // Kit components under shared/ui/ use the ui- selector prefix (Q4).
    files: ['src/app/shared/ui/**/*.ts'],
    plugins: {
      '@angular-eslint': angular,
    },
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'ui', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ui', style: 'camelCase' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    rules: {
      ...angularTemplate.configs.recommended.rules,
      ...angularTemplate.configs.accessibility.rules,
    },
  },
];
