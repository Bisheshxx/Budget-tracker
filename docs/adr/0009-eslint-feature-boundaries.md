# ESLint-enforced feature boundaries

## Status

accepted

## Context

[ADR 0002](./0002-feature-based-modules.md) and [ADR 0003](./0003-shared-cross-feature-module.md) describe feature isolation as the target and promotion-on-second-consumer as the rule for moving code to `src/shared/`, but neither was enforced by tooling — only by convention and periodic audit. An audit of the codebase found that rule already drifting: `categories`, `profile`, and `transactions` were each imported directly by 3+ sibling features (`categories`/`profile` by `transactions`, `recurring`, and `reports`; `transactions` by `recurring` and `reports`, including `recurring` reusing the whole `QuickAddForm` component), and the reports data-layer port (`src/data/reports/supabase-reports-repository.ts`) reached into two features' non-type modules (`computeComparison`/`computeWeeks`, `rollup`) rather than just their domain types. [ADR 0008](./0008-layered-folders-and-constants.md) explicitly named this as accepted debt ("existing sibling feature imports can be removed in later, behavior-focused refactors").

Separately, a reference project (WebDevSimplified's `parity-deals-clone`, `feature-folder-structure` branch) demonstrated using `eslint-plugin-boundaries` to hard-fail any feature-to-feature import, catching exactly this class of drift automatically. That project has no repository/port abstraction (it calls its ORM directly from `features/*/server/db`), so its structure isn't a fit wholesale — this app's swappable-repository layer (ADR 0001) is deliberately kept — but the boundaries-enforcement idea is.

## Decision

- **Promoted the overdue shared candidates** (satisfying ADR 0003's "promote on second consumer" retroactively):
  - Categories: `Category`/`CategoryCreate`/`CategoryUpdate`/`CategoryPageCursor`/`CategoryPageRequest` types, `category.schema.ts`, `CATEGORY_COLORS`/`CATEGORY_PAGE_SIZE` constants, `use-categories.ts`, `use-category-lookup.ts`, `CategoryChip`/`CategoryIcon`/`CategoryPicker` → `src/shared/`. `category-service.ts`, `CategoryManager`, `CategoryCreateForm`, and the feature's `index.ts` composition root stay in `src/features/categories/`.
  - Profile: `UserProfile`/`ProfileUpdate` types and `use-profile.ts` → `src/shared/`. `profile-service.ts`, `schema.ts`, `OnboardingForm`, `SettingsForm`, and `index.ts` stay in `src/features/profile/`.
  - Transactions: `Transaction`/`CategorySpend`/`PeriodSummary`/etc. types, `transaction.schema.ts` (quick-add + range schemas), `TRANSACTION_TYPES`/`TRANSACTION_PAGE_SIZE` constants, `summary.util.ts` (`rollup`), `QuickAddForm`, and the `useCreateTransaction`/`useUpdateTransaction` mutations → `src/shared/`. `transaction-service.ts`, `useTransactionsInfinite`/`usePeriodSummary`/`useDeleteTransaction`, `CashflowSummary`, `RecentTransactions`, `RangeFilter`, and `index.ts` stay in `src/features/transactions/`.
  - Report compute: `computeComparison`/`computeWeeks`/`percentChange` (formerly `features/reports/comparison.ts`) → `src/shared/services/report-compute.util.ts`, so the reports data-layer port only ever reaches into `shared`, never a feature's internals.
- **Added `eslint-plugin-boundaries`**, configured in `eslint.config.js` with four element types:
  - `feature-public` — a feature's `index.ts` barrel (its composition root, ADR 0002) plus its domain-type leaf module (`types.ts` / `types/**`, per ADR 0004 — every `data/<feature>` port already imports these, so this generalizes an existing pattern rather than adding a new one).
  - `auth-context` — `src/features/auth/contexts/**`, the one non-type, non-barrel module already treated as consumable app-wide (`useAuth`/`AuthProvider`, used directly by `profile`, `Header.tsx`, and most routes; CLAUDE.md itself names this exact import as the sanctioned "explicit path" example).
  - `feature` — everything else under `src/features/<name>/` (private internals).
  - `shared` / `app` — `src/shared`, `src/data`, `src/lib`, `src/components`, `src/integrations` and `src/routes`/`src/router.tsx`/`src/routeTree.gen.ts` respectively.
  - Rule: a feature may import only itself, `shared`, `feature-public`, or `auth-context` — never another feature's internals. `shared` may import `shared`, `feature-public`, or `auth-context` — never a feature's private internals (this is what forced the promotions above and what keeps `src/data/<feature>` ports honest going forward). `app` (routes) may import anything.
- **The swappable-repository pattern (ADR 0001) is unaffected.** Ports and adapters stay exactly where they were, in `src/data/<feature>/`; nothing about how Supabase gets swapped out changes.

## Consequences

- New cross-feature reuse must go through `src/shared/` (or, for auth specifically, its context) from now on — the lint rule fails the build otherwise, rather than relying on the next audit to catch it.
- `src/shared/types/`, `src/shared/schemas/`, and `src/shared/services/` are now populated subfolders (previously mentioned as ad hoc in ADR 0003/0008 but empty in practice).
- `categories`, `profile`, and `transactions` are now thinner features: each keeps only its CRUD/management UI and service, with the read-model (types, query hooks, display components) living in `shared`. This mirrors how `Money`/`period` already work as shared domain primitives with no dedicated feature.
- A feature's `types.ts`/`types/**` leaf module is now formally "public" (reachable from `shared` and other features' ports) wherever it lives — this is what ADR 0004 already implied for the data layer, made explicit and machine-checked here.
