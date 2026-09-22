//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import boundaries from 'eslint-plugin-boundaries'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    // Design system guard: components must take color from the semantic theme
    // tokens in src/styles.css (e.g. bg-primary, text-muted-foreground,
    // bg-income-bg), never raw color literals. `var(--…)` is allowed since it
    // points at a token. See CLAUDE.md › Design system / docs/adr/0005.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/database.types.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]',
          message:
            'Use a semantic theme token (see CLAUDE.md › Design system), not a raw hex color.',
        },
        {
          selector: 'Literal[value=/\\brgba?\\(/]',
          message:
            'Use a semantic theme token (see CLAUDE.md › Design system), not a raw rgb()/rgba() color.',
        },
        {
          selector:
            'TemplateElement[value.raw=/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]',
          message:
            'Use a semantic theme token (see CLAUDE.md › Design system), not a raw hex color.',
        },
        {
          selector: 'TemplateElement[value.raw=/\\brgba?\\(/]',
          message:
            'Use a semantic theme token (see CLAUDE.md › Design system), not a raw rgb()/rgba() color.',
        },
      ],
    },
  },
  {
    // Feature isolation: a feature may only import itself or `shared`
    // (src/shared, src/data, src/lib, src/components, src/integrations). Routes
    // (`app`) may import anything. Two carve-outs (checked before the catch-all
    // `feature` pattern) model the app's existing "this is the public surface"
    // conventions rather than inventing a new one: `feature-public` is a
    // feature's index.ts barrel (its composition root, ADR-0002) plus its domain
    // type leaf module (ADR-0004 — every data/<feature> port already imports
    // these); `auth-context` is auth's context specifically, the one
    // non-type, non-barrel module CLAUDE.md's own example already treats as
    // consumable app-wide. This is what forced the categories/profile/
    // transactions promotions to src/shared/ — see docs/adr/0009.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/lib/database.types.ts',
      'src/routeTree.gen.ts',
      'src/vite-env.d.ts',
    ],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/include': ['src/**/*.{ts,tsx}'],
      'boundaries/elements': [
        {
          type: 'feature-public',
          mode: 'full',
          capture: ['featureName'],
          pattern: [
            'src/features/*/index.ts',
            'src/features/*/types.ts',
            'src/features/*/types/**/*',
          ],
        },
        {
          type: 'auth-context',
          mode: 'full',
          pattern: ['src/features/auth/contexts/**/*'],
        },
        {
          type: 'feature',
          mode: 'full',
          capture: ['featureName'],
          pattern: ['src/features/*/**/*'],
        },
        {
          type: 'shared',
          mode: 'full',
          pattern: [
            'src/shared/**/*',
            'src/data/**/*',
            'src/lib/**/*',
            'src/components/**/*',
            'src/integrations/**/*',
          ],
        },
        {
          type: 'app',
          mode: 'full',
          pattern: [
            'src/routes/**/*',
            'src/router.tsx',
            'src/routeTree.gen.ts',
          ],
        },
      ],
    },
    rules: {
      'boundaries/no-unknown': 'error',
      'boundaries/no-unknown-files': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: ['shared'],
              allow: ['shared', 'feature-public', 'auth-context'],
            },
            {
              from: ['feature'],
              allow: [
                'shared',
                'feature-public',
                'auth-context',
                ['feature', { featureName: '${from.featureName}' }],
              ],
            },
            {
              from: ['feature-public'],
              allow: [
                'shared',
                ['feature', { featureName: '${from.featureName}' }],
              ],
            },
            {
              from: ['auth-context'],
              allow: ['shared', ['feature-public', { featureName: 'auth' }]],
            },
            {
              from: ['app'],
              allow: [
                'shared',
                'feature-public',
                'auth-context',
                'feature',
                'app',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      // Generated by `supabase gen types`; not hand-edited.
      'src/lib/database.types.ts',
      // Generated by the TanStack Router CLI; not hand-edited.
      'src/routeTree.gen.ts',
      // Deno Edge Functions run in an isolated runtime (Deno globals,
      // jsr:/https: imports) and aren't part of the Vite/tsconfig project —
      // see docs/adr/0010.
      'supabase/functions/**',
    ],
  },
]
