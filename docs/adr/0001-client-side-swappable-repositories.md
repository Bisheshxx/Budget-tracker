# Client-side swappable repositories for V1; SSR and AI deferred

## Status

accepted

## Context

The app is built on TanStack Start (an SSR framework), but V1 prioritizes shipping core cashflow functionality over SEO. We also want a clean path to replace Supabase with our own backend later without rewriting UI components.

## Decision

- **Data access is a swappable repository layer** behind interfaces (`ITransactionRepository`, etc.), wired in a single container. Supabase implementations now; axios-based API implementations later. Components call services only, never a data client directly.
- **For V1, repositories run client-side** (in the browser, via TanStack Query). The Supabase JS client carries the logged-in user's session, so RLS enforces ownership correctly. A singleton container is acceptable because each browser serves exactly one user.
- **SSR for app data is deferred.** V1 renders the dashboard then fetches client-side. SEO is a future concern.
- **AI overviews are deferred** to the future backend — not part of V1. No `Anthropic` SDK usage or secret keys in the V1 client.

## Consequences

- The "swap one file" promise holds **for the data source** (container + repos). **Auth is a separate, known second swap** (Supabase Auth → own JWT flow) — it lives outside the repository layer and is not one file. The plan should not claim otherwise.
- Moving to SSR later is **not blocked**: once on our own backend, axios repositories can run server-side too, forwarding the user's JWT from a loader/server function. SSR data fetching slots in at that point.
- Because AI requires a secret key, if/when it lands it must run server-side (server function or the future backend), never in the client.
- **RLS is defense-in-depth, not the frontend's source of truth.** The contract the frontend depends on is the repository interface ("return only this user's data"), satisfied today by both explicit `userId` filtering and RLS. RLS can *mask* scoping bugs (a query that forgets to scope by user still looks correct on Supabase), so: (1) the future backend must derive identity from the JWT, never trust a client-supplied `userId` for authorization; (2) scoping is tested at the service seam with in-memory fakes (no RLS), so a missing filter fails immediately instead of surfacing only at migration.
