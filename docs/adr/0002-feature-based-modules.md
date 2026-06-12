# Feature-based modules for application code

## Status

accepted

## Context

The layering pattern (zod schema → repository → service → hook → component, see [ADR 0001](./0001-client-side-swappable-repositories.md)) was clean and consistent, but the code for a single feature was spread across five top-level folders: `src/data/<feature>/`, `src/services/<feature>-service.ts`, `src/lib/<feature>-context.tsx`, `src/lib/schemas/<feature>.ts`, and `src/components/<feature>-thing.tsx`. Understanding one feature meant opening five directories, and `src/lib/` had become a junk drawer. As the app grows (transactions, budgets, …) this would compound.

## Decision

- **Application code is grouped by feature under `src/features/<feature>/`.** Each feature owns its service, hook(s), `schema.ts`, `components/`, and a public `index.ts` barrel that acts as the feature's **composition root** — it wires that feature's service singleton to the active repository (e.g. `export const authService = new AuthService(authRepository)`). This replaces the former single `src/services/index.ts`.
- **The repository layer stays in `src/data/<feature>/`** for now (the swap point from ADR 0001 is unchanged). Feature barrels import their repository from `#/data/<feature>`. A future ADR may revisit whether `data/` folds into `features/`.
- **`src/lib/` is shared infrastructure only** — the Supabase client, generated `database.types.ts`, and cross-cutting utilities (`money.ts`, `utils.ts`). No feature-specific code.
- **`src/components/` is cross-feature UI only** (`Header`, `Footer`, `ThemeToggle`, and `ui/` shadcn primitives). Feature-specific components live in their feature's `components/`.
- **Naming:** component files are **PascalCase** (matching the exported component, e.g. `GoogleButton.tsx`); every other `.ts(x)` file — services, hooks, schemas, data — is **kebab-case**.
- **Imports:** cross-directory imports use the `#/` alias; same-directory imports may be relative. To avoid an import cycle, a feature's `index.ts` only wires/exports leaf modules (the service class + repository); context and components are imported from their explicit module paths (`#/features/auth/auth-context`), never re-exported by the barrel.

## Consequences

- To add a feature, create `src/features/<name>/` and keep everything for it there — do not spread it across the top-level layer folders.
- Tests mirror the new tree under `tests/features/<feature>/`. Service unit tests still import the **class** directly (`#/features/auth/auth-service`) and inject a fake repository, so they stay free of Supabase/env per ADR 0001 (the barrel — which instantiates the real repository — is never imported in unit tests).
- Deferred follow-ups (not done in this change): collapsing the duplicate `#/` + `@/` path aliases into one, moving devtools packages to `devDependencies`, and adding a typed `env` module + `.env.example`.
