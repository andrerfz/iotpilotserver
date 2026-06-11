import type { Config } from 'tailwindcss';

// fe-foundation Q3: Tailwind provides layout/spacing utilities only; Ionic owns
// colors, typography and theming via its CSS variables. Preflight is DISABLED so
// Tailwind's base reset never overrides Ionic component styles (no visual bleed).
// Design tokens (prototype app.css) are mapped onto theme.extend in fe-ui-kit T2.
//
// Angular's build auto-detects tailwind.config.{js,cjs,mjs,ts} in the project
// root and wires it into PostCSS — no manual postcss config needed.
export default {
  content: ['./src/**/*.{html,ts}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
