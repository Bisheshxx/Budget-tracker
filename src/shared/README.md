# `src/shared/` — cross-feature application code

Home for application code that is **shared across features but owned by none** and
carries **domain meaning** — so it doesn't belong in `src/lib/` (pure infra) or
`src/components/` (app chrome + shadcn `ui/` primitives).

## What goes where

- **`src/lib/`** — framework/infra plumbing, no domain meaning (Supabase client,
  generated `database.types.ts`, `cn`, money conversion).
- **`src/components/`** — app chrome (`Header`, `Footer`, `ThemeToggle`) + shadcn
  `ui/` primitives.
- **`src/shared/`** — cross-feature hooks, services, and domain-specific
  components reused by **2+ features**.
- **`src/features/<feature>/`** — anything used by a single feature stays there.
  Promote to `shared/` only when a **second** feature needs it.

## Conventions

- Subfolders: `components/`, `hooks/`, `services/`, `schemas/`, `stores/`, `lib/`,
  `utils/`,
  `database/`, `types/`, `constants/` (add others only when the ownership is
  clear).
  `stores/` holds zustand stores for **ephemeral client UI state only** (e.g. which dialog is
  open) — never per-user data, which would leak across requests during SSR (see ADR 0007).
- Shared constants live in `constants/<area>.constant.ts`, e.g.
  `constants/period.constant.ts`. Feature-owned constants use the same pattern
  inside the feature, e.g. `src/features/profile/constants/profile.constant.ts`.
- Files inside `utils/` use `<area>.util.ts` naming, e.g.
  `string.util.ts` or `array.util.ts`. Use `lib/` instead for larger named
  modules such as `period.ts` or `money.ts`.
- **No barrel `index.ts`.** Unlike a feature barrel (a composition root that wires
  a service to its repository), `shared/` has no single root — import leaf modules
  by explicit path: `#/shared/hooks/use-foo`, `#/shared/components/Foo`. This
  avoids import cycles (see ADR 0002) and ADR 0003.
- Naming: component files PascalCase (`MoneyAmount.tsx`); hooks/services/schemas
  kebab-case (`use-media-query.ts`).
- Tests mirror this tree under `tests/shared/`.
- **`eslint-plugin-boundaries` enforces this at lint time** (see ADR 0009): a
  feature may import only itself, `shared`, its own barrel, or (auth only)
  `#/features/auth/contexts/*` — never another feature's internals. That's what
  keeps this folder honest going forward instead of drifting like `categories`/
  `profile`/`transactions` did before ADR 0009's promotions.
