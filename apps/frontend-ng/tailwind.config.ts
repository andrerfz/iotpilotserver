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
  // ThemeService adds/removes .dark on <html> to activate dark: utilities (T2).
  darkMode: 'class',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      // Prototype design tokens as Tailwind arbitrary-value aliases.
      // These mirror tokens.css so templates can use bg-[--surface] etc.
      colors: {
        'ui-bg':       'var(--bg)',
        'ui-surface':  'var(--surface)',
        'ui-surface-2':'var(--surface-2)',
        'ui-surface-3':'var(--surface-3)',
        'ui-elevated': 'var(--elevated)',
        'ui-text':     'var(--text)',
        'ui-muted':    'var(--text-muted)',
        'ui-dim':      'var(--text-dim)',
        'ui-border':   'var(--border)',
        'ui-primary':  'var(--primary)',
        'ui-success':  'var(--success)',
        'ui-warning':  'var(--warning)',
        'ui-danger':   'var(--danger)',
        'ui-info':     'var(--info)',
      },
      borderRadius: {
        'ui-sm': 'var(--r-sm)',
        'ui':    'var(--r)',
        'ui-lg': 'var(--r-lg)',
      },
      fontFamily: {
        'ui-sans': 'var(--font-sans)',
        'ui-mono': 'var(--font-mono)',
      },
    },
  },
  plugins: [],
} satisfies Config;
