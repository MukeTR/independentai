import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper:     'var(--paper)',
        'paper-2': 'var(--paper-2)',
        'paper-3': 'var(--paper-3)',
        'paper-4': 'var(--paper-4)',

        ink:           'var(--ink)',
        'ink-muted':   'var(--ink-muted)',
        'ink-faint':   'var(--ink-faint)',

        hairline:     'var(--hairline)',
        'hairline-2': 'var(--hairline-2)',

        brand:        'var(--brand)',
        'brand-deep': 'var(--brand-deep)',
        'brand-glow': 'var(--brand-glow)',

        positive: 'var(--positive)',
        warning:  'var(--warning)',
        danger:   'var(--danger)',
      },
      fontFamily: {
        display: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
        sans:    ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      letterSpacing: { eyebrow: '0.18em' },
      borderWidth: { hairline: '0.5px' },
    },
  },
  plugins: [],
};
export default config;
