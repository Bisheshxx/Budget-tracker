# Layered folders and constants convention

## Status

accepted

## Context

The app already separates TanStack Start routes from feature code, but the
folder boundaries need to be easier to scan. The desired direction is a layered
frontend structure:

- a global foundation used across the app,
- isolated business-domain features,
- an application layer that composes features into pages.

Because this is TanStack Start, `src/routes/` is the application layer. Moving it
to `src/app/` would fight file-based routing and risk breaking the app. shadcn
is also configured to generate into `src/components/ui`, so that folder remains
unchanged.

## Decision

- **Keep routes stable.** `src/routes/` remains the app layer and should not be
  moved for folder-structure cleanup.
- **Keep shadcn stable.** `src/components/ui` remains the home for shadcn
  primitives and `components.json` continues to point there.
- **Use `src/shared/` as the global foundation** for reusable app code with no
  feature dependency. Supported subfolders include `components/`, `hooks/`,
  `services/`, `stores/`, `lib/`, `utils/`, `database/`, `types/`, and
  `constants/`.
- **Use `src/features/<feature>/` for business domains.** A feature can contain
  `components/`, `hooks/`, `schemas/`, `services/`, `server/`, `types/`, and
  `constants/` as needed. Existing feature files may remain at their current
  paths until a scoped refactor moves them.
- **Constants live in constants folders.** Shared constants go in
  `src/shared/constants/<area>.constant.ts`; feature constants go in
  `src/features/<feature>/constants/<feature>.constant.ts`.
- **Utility files use utility suffixes.** Files inside any `utils/` folder use
  `<area>.util.ts` naming, e.g. `period.util.ts`. Larger reusable modules with a
  domain or infrastructure concept belong in `lib/` instead.
- **Prefer stable compatibility exports** when moving constants out of schemas
  or helpers, so existing route-facing imports do not need to change.

## Consequences

- Constants such as Period bounds, date math values, option arrays, page sizes,
  and domain rule values are discoverable in one place per area.
- Folder cleanup can proceed incrementally without touching route files.
- Feature isolation remains a target, but existing sibling feature imports can
  be removed in later, behavior-focused refactors.
