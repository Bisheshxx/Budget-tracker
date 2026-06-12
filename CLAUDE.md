# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This project uses **pnpm**.

- `pnpm dev` — start the dev server on port 3000 (Vite + TanStack Start).
- `pnpm build` / `pnpm preview` — production build / preview the build.
- `pnpm test` — run the Vitest suite once. Run a single test with `pnpm vitest run <path>` or watch a file with `pnpm vitest <path>`.
- `pnpm lint` — ESLint (config from `@tanstack/eslint-config`).
- `pnpm format` — Prettier write + `eslint --fix`. `pnpm check` — Prettier check only.
- `pnpm generate-routes` — regenerate `src/routeTree.gen.ts` via the TanStack Router CLI (`tsr generate`).

Add shadcn/ui components with `pnpm dlx shadcn@latest add <component>` (style: new-york, base color: zinc, icons: lucide). They land in `src/components/ui`.

## Architecture

This is a **TanStack Start** app (full-stack React 19 framework on Vite) using **file-based routing** and **SSR** with TanStack Query integration.

- **Routing is file-based.** Routes live in `src/routes/`; each file exports a `Route` created with `createFileRoute`. The router plugin (in `vite.config.ts`) watches these files and generates `src/routeTree.gen.ts` — this file is generated, never edit it by hand (run `pnpm generate-routes` if it's missing or stale). `src/routes/__root.tsx` is the root layout: it owns the `<html>` shell, document head, theme-init script, and devtools, and renders `Header`/`{children}`/`Footer`.

- **Router setup** lives in `src/router.tsx` (`getRouter`). It wires the route tree to a per-request context, enables `defaultPreload: 'intent'` and scroll restoration, and calls `setupRouterSsrQueryIntegration` so server-fetched query data hydrates on the client. The `Register` module augmentation here gives the whole app typed router access.

- **TanStack Query context** comes from `src/integrations/tanstack-query/root-provider.tsx`'s `getContext()`, which creates the `QueryClient` injected into the router context (typed as `MyRouterContext` in `__root.tsx`). Note the default export `TanstackQueryProvider` in that file is currently an empty no-op component — only `getContext` is actually used.

- **Data fetching** can go through TanStack Query or a route `loader`. Server-only logic uses `createServerFn` from `@tanstack/react-start`; API routes are defined via a `server.handlers` map on a route.

- **Styling** is Tailwind CSS v4 via `@tailwindcss/vite` (no `tailwind.config` file — configured through `src/styles.css`). Use the `cn()` helper in `src/lib/utils.ts` (clsx + tailwind-merge) to compose class names. Theming is class-based (`light`/`dark` on `<html>`) with an inline script in `__root.tsx` that resolves the stored/`auto` theme before hydration; `ThemeToggle` drives it.

- **Design system (see `docs/adr/0005`).** The app's "paper + teal" palette is the single source of truth, defined once per mode (`:root` / `.dark`) in `src/styles.css`. **Components take color only from the semantic theme tokens — never raw hex / `rgb()` / `rgba()`.** Use the Tailwind utilities those tokens generate: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`/`text-primary-foreground` (the teal accent — CTAs, links, progress), `border-border`, `text-destructive`, and the money tokens `bg-income-bg`/`text-income` and `bg-expense-bg`/`text-expense`. To recolor the app, edit the tokens, not the screens. An **ESLint guard** in `eslint.config.js` fails on raw color literals in `src/**/*.{ts,tsx}` (`var(--…)` is allowed since it points at a token). **Always render money via `#/shared/components/Money`** (or `MoneyBadge` for the income/expense pill), which formats integer cents through `formatMoney` in `#/lib/money` and applies the income/expense tones — don't hand-format amounts.

- **Application code is grouped by feature** under `src/features/<feature>/` (see `docs/adr/0002`). Each feature owns its service, hook(s), `schema.ts`, `types.ts` (domain types), `components/`, and a public `index.ts` barrel that is the feature's **composition root** — it wires the service singleton to its repository (e.g. `export const authService = new AuthService(authRepository)`). **To add a feature, create `src/features/<name>/` — don't spread it across the top-level layer folders.** Domain types live in `src/features/<feature>/types.ts`; the repository **interface (port)** lives in `src/data/<feature>/IXxxRepository.ts` alongside its Supabase **implementation** and the swap-point `index.ts` (the swap point from `docs/adr/0001`). The port imports its domain types from `#/features/<feature>/types`; services import the port from `#/data/<feature>/IXxxRepository` (see `docs/adr/0004`). `src/lib/` is shared infra only (Supabase client, `database.types.ts`, `money.ts`, `utils.ts`); `src/components/` is cross-feature UI only (`Header`, `Footer`, `ThemeToggle`, `ui/`). To avoid import cycles, a feature `index.ts` only wires/exports leaf modules — import context, components, and domain types from their explicit paths (`#/features/auth/auth-context`, `#/features/auth/types`), not the barrel (the data layer imports domain types from `#/features/<feature>/types`, so routing them through the barrel would cycle).

- **Cross-feature code lives in `src/shared/`** (see `docs/adr/0003`) — hooks, services, and domain-specific components reused by **2+ features** but owned by none. It's distinct from `src/lib/` (infra, no domain meaning) and `src/components/` (app chrome + shadcn `ui/`). Keep single-feature code in its feature; promote to `shared/` only when a **second** feature needs it. Subfolders are `components/`, `hooks/`, `services/` (add more ad hoc). `src/shared/` has **no barrel** — import leaf modules by explicit path (`#/shared/hooks/use-foo`, `#/shared/components/Foo`). See `src/shared/README.md`.

## Conventions

- **Import aliases:** `#/*` and `@/*` both map to `src/*` (see `tsconfig.json` and `package.json` `imports`). shadcn aliases resolve `#/components`, `#/lib/utils`, etc. Use the `#/` alias for cross-directory imports; only same-directory imports should be relative (`./schema`).
- **File naming:** component files are **PascalCase** (matching the exported component, e.g. `GoogleButton.tsx`); every other `.ts(x)` file — services, hooks, schemas, data — is **kebab-case** (e.g. `auth-service.ts`, `use-profile.ts`). **Exception:** a repository interface file is **PascalCase** named after the interface it exports (e.g. `IProfileRepository.ts`), since like a component the file maps 1:1 to a single named export.
- TypeScript is `strict` with `noUnusedLocals`/`noUnusedParameters` and `verbatimModuleSyntax` — use `import type` for type-only imports.
- Files prefixed `demo` (e.g. `src/routes/demo/`) are starter examples and safe to delete.
- **Tests live in a top-level `tests/` folder, not co-located with source.** Mirror the `src/` structure under `tests/` (e.g. `src/features/auth/auth-service.ts` → `tests/features/auth/auth-service.test.ts`) and name files `*.test.ts(x)`. Import the code under test via the `#/*` alias (e.g. `import { AuthService } from '#/features/auth/auth-service.ts'`). Service unit tests import the **class** directly and inject a fake repository — never the feature `index.ts` barrel, which instantiates the real Supabase-backed repository. Vitest's defaults discover `tests/` with no extra config.
- **Forms & validation:** use **react-hook-form** with **zod** (via `@hookform/resolvers`'s `zodResolver`) for all forms. Define the zod schema as the single source of truth in the feature's `schema.ts` (e.g. `src/features/auth/schema.ts`) and reuse it both in the form resolver and in the service-layer validation (e.g. `AuthService` validates with `credentialsSchema` via `safeParse`) so UI and service rules never drift. Build the markup with the shadcn **`Form`** primitives (`src/components/ui/form.tsx`): wrap the `<form>` in `<Form {...form}>` and bind every field with `<FormField control={form.control} name=… render={({ field }) => (…)} />`, laying each out as `FormItem` → `FormLabel` → `FormControl` (wrapping the input/`Select`) → optional `FormDescription` → `FormMessage`. `FormField` uses RHF's `Controller` under the hood, so spread `{...field}` onto the control rather than `register(...)` — this is the standard for all forms (see `src/features/profile/components/OnboardingForm.tsx` and `src/routes/signup.tsx`). Surface submit failures via `setError('root', …)`, drive disabled/loading state from `isSubmitting`, and add `noValidate` to the `<form>` so zod owns validation. Note: schemas using `z.coerce`/`z.preprocess` have a `z.input` type of `unknown`, so when binding string inputs override the spread with `value={field.value as string}`. See `src/features/auth/schema.ts` and `src/routes/login.tsx`.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/` (no remote). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical default labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
