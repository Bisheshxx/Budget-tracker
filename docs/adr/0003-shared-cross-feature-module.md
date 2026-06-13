# A `src/shared/` module for cross-feature application code

## Status

accepted

## Context

[ADR 0002](./0002-feature-based-modules.md) grouped application code by feature under `src/features/<feature>/` and gave the remaining top-level folders narrow roles: `src/lib/` is **infrastructure only** (Supabase client, generated `database.types.ts`, `money.ts`, `utils.ts`) and `src/components/` is **cross-feature UI only** (`Header`, `Footer`, `ThemeToggle`, `ui/` shadcn primitives).

That leaves a gap: code that is **shared across features but owned by none** and that carries **domain meaning** — a hook used by both Dashboard and Reports, a domain helper/service spanning features, a domain-specific shared component. It is not infra (so not `src/lib/`, which ADR 0002 explicitly fought to keep from becoming a junk drawer) and not a generic UI primitive (so not `src/components/`). The only options today are to dump it in `src/lib/` or duplicate it across features. As features land (transactions, dashboard, reports, settings), this compounds.

## Decision

- **Add a top-level `src/shared/` folder** — a sibling to `features/`, `lib/`, and `components/` — as the home for cross-feature application code with domain meaning: **hooks, services, and domain-specific components reused by 2+ features**.
- **Additive, not a migration.** `src/lib/` and `src/components/` keep their ADR 0002 roles unchanged; no existing files move. The boundary:
  - `src/lib/` — framework/infra plumbing, no domain meaning.
  - `src/components/` — app chrome + shadcn `ui/` primitives.
  - `src/shared/` — cross-feature hooks/services/domain components.
  - `src/features/<feature>/` — single-feature code stays in its feature.
- **Promote on the second consumer.** Code starts in the feature that owns it; move it to `src/shared/` only when a **second** feature needs it. This keeps `shared/` from becoming the new junk drawer.
- **Subfolders:** `components/`, `hooks/`, `services/` (add `schema.ts` and others ad hoc).
- **No barrel `index.ts`.** Unlike a feature barrel — a composition root that wires a service singleton to its repository — `src/shared/` has no single root and nothing to wire. Import leaf modules by explicit path (`#/shared/hooks/use-foo`, `#/shared/components/Foo`), which also avoids the import cycles ADR 0002 guards against.
- **Naming** follows ADR 0002: component files PascalCase (`MoneyAmount.tsx`); hooks/services/schemas kebab-case (`use-media-query.ts`).

## Consequences

- New cross-feature hooks/services/domain components land in `src/shared/<kind>/`; reach for it instead of `src/lib/` when the code has domain meaning.
- Tests mirror the tree under `tests/shared/`, consistent with the existing `tests/` convention.
- The folder ships seeded empty (`.gitkeep` in each subfolder) — `auth` and `profile` currently share nothing cross-feature, so nothing is promoted in this change.
- A short `src/shared/README.md` restates the boundary in-tree so the rule is discoverable without opening the ADRs.
