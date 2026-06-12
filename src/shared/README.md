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

- Subfolders: `components/`, `hooks/`, `services/` (add `schema.ts`, etc. ad hoc).
- **No barrel `index.ts`.** Unlike a feature barrel (a composition root that wires
  a service to its repository), `shared/` has no single root — import leaf modules
  by explicit path: `#/shared/hooks/use-foo`, `#/shared/components/Foo`. This
  avoids import cycles (see ADR 0002) and ADR 0003.
- Naming: component files PascalCase (`MoneyAmount.tsx`); hooks/services/schemas
  kebab-case (`use-media-query.ts`).
- Tests mirror this tree under `tests/shared/`.
