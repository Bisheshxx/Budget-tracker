# One data-source factory, and errors as part of the repository contract

## Status

accepted

## Context

[ADR 0001](./0001-client-side-swappable-repositories.md) put data access behind repository interfaces "wired in a single container" so Supabase can later be replaced by our own backend. [ADR 0004](./0004-domain-types-in-features-ports-in-data.md) settled where the ports live. An audit ahead of building that backend found the ports themselves in good shape — nothing outside `src/data/` imports supabase-js or `database.types.ts`, every adapter maps rows to domain types — but three things would have made the swap harder than "one file":

1. **There was no single container.** Each of the six `src/data/<feature>/index.ts` files constructed its own `new Supabase…Repository()`. Swapping the backend meant six edits, and the one cross-repository dependency (reports derives from transactions) was wired by one swap point importing another.
2. **Errors were not part of the contract.** Adapters did `if (error) throw error`, so raw `PostgrestError` / `AuthError` objects crossed the port. Nothing above the data layer inspects them today, but the first screen that wants "this name is taken" vs. "you're offline" would have had to match Postgres codes — and would break on the new backend.
3. **Cache keys were string literals repeated across hooks.** `['transactions', 'infinite', userId]` appeared in four files; a mutation that mistypes one fails silently (the invalidation matches nothing), which already caused a bug in recurring's reconcile. This is unrelated to Supabase but is the layer directly above the repositories, and every data-shape change during the migration will touch it.

## Decision

- **Abstract Factory for the backend.** `src/data/IDataSource.ts` names the whole repository family (`auth`, `categories`, `profile`, `recurring`, `reports`, `transactions`). A backend is a factory returning that: `createSupabaseDataSource()` in `src/data/supabase-data-source.ts` today. `src/data/index.ts` holds the one active instance — **the** swap point. The per-feature `src/data/<feature>/index.ts` modules stay as the import paths everything already uses (`#/data/transactions`) but now just hand out `dataSource.<feature>`; they no longer name an implementation.
  - Migration can be all-at-once (replace the factory) or one domain at a time (spread the Supabase family and override the domains that have moved). Both are edits to `src/data/index.ts` only.
  - No runtime/env switch is added yet. With a single implementation it would be dead configuration; add it alongside the second factory if a side-by-side rollout is wanted.
- **`DataError` is the error half of every port.** `src/data/data-error.ts` defines `DataError` with a `code`: `invalid`, `unauthenticated`, `forbidden`, `not-found`, `conflict`, `rate-limited`, `network`, `unknown` — chosen to map 1:1 onto the HTTP statuses the new backend will return. Adapters must throw `DataError` and nothing else for a failed data call. `src/data/supabase-error.ts` (`toDataError`) is the Supabase translation: Postgres/PostgREST codes, auth error codes, HTTP status, and dropped connections. The original error is kept as `cause`; the message is passed through unchanged, so user-facing copy did not change.
- **Query Key Factory.** `src/shared/lib/query-keys.ts` is the only place a TanStack Query key is written. Keys are hierarchical (the short form is a prefix of the full key) and two helpers, `invalidateTransactionViews` and `invalidateCategoryViews`, replace the hand-copied invalidation lists.
- **One validation helper.** `parseOrThrow` (`src/shared/utils/validation.util.ts`) replaces the seven copies of `safeParse` → `throw new Error(issues[0].message)` in the services.
- **One row mapper per table.** The recurring adapter reuses the transactions adapter's `toTransaction` instead of carrying its own copy.

## Consequences

- Adding the new backend is: write `Api<X>Repository` classes implementing the existing ports and throwing `DataError`, add `createApiDataSource()`, change `src/data/index.ts`. Services, hooks, components and routes do not change. Auth remains the "known second swap" from ADR 0001 in the sense that the OAuth redirect/callback flow is backend-shaped, but it is now behind the same factory.
- UI may branch on `isDataError(err) && err.code === …`. It must not look at `err.cause`, which is backend-specific.
- A new adapter test must assert the `DataError` code on failure (see `tests/data/**`), and the Supabase adapters are now covered by tests that record the queries they build, so their behaviour is pinned down as the reference for the replacement.
- Still coupled to Supabase by behaviour rather than by import, and worth designing for in the new backend:
  - `userId` is passed in from the client on most port methods; the backend must derive identity from the token and ignore it for authorization (already called out in ADR 0001).
  - `RecurringService.reconcileDue` orchestrates two repositories from the client and relies on both writes being first-writer-wins. A backend can offer this as one transactional endpoint; the port can grow a `reconcileDue` method then.
  - Deleting a recurring template is two non-atomic calls inside the Supabase adapter.
  - Port doc comments still mention RLS and DB constraints as the mechanism; read them as "the backend guarantees this".
