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

## Conventions

- **Import aliases:** `#/*` and `@/*` both map to `src/*` (see `tsconfig.json` and `package.json` `imports`). shadcn aliases resolve `#/components`, `#/lib/utils`, etc.
- TypeScript is `strict` with `noUnusedLocals`/`noUnusedParameters` and `verbatimModuleSyntax` — use `import type` for type-only imports.
- Files prefixed `demo` (e.g. `src/routes/demo/`) are starter examples and safe to delete.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/` (no remote). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical default labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
