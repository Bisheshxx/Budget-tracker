# Folder Structure

Use this as the Budget-tracker source of truth when reorganizing code. The global `frontend-folder-structure` skill gives the workflow; this file gives the local decisions.

## Layers

- `src/routes/` is the TanStack Start app layer. Keep route files, search validation, loaders, layout, and page composition here.
- `src/features/<feature>/` owns feature-specific UI, hooks, schemas, services, domain types, constants, and utils.
- `src/shared/` owns code reused by 2+ features and has no barrel. Import leaf modules directly.
- `src/data/<domain>/` stays flat by default: `I<X>Repository.ts`, `supabase-<domain>-repository.ts`, and `index.ts` as the swap point.
- `src/lib/` is shared infrastructure only.
- `src/components/ui/` stays the shadcn location configured by `components.json`.

## Feature Shape

Feature folders may mirror this shape when useful:

```txt
src/features/<feature>/
  components/
  contexts/
  hooks/
  schemas/
  services/
  server/
  types/
  utils/
  constants/
```

Do not create empty folders just for symmetry. Existing flat feature files can stay until a focused refactor moves them.

## Naming

- Components: `PascalCase.tsx`.
- Contexts/providers: `contexts/<area>-context.tsx`.
- Hooks: `use-thing.ts`.
- Services: `thing-service.ts`.
- Schemas: `schemas/<feature>.schema.ts` for structured features, or existing `schema.ts` for flat ones.
- Types: `types/<feature>.type.ts` for structured features, or existing `types.ts` for flat ones.
- Utils: `utils/<area>.util.ts`.
- Constants: `constants/<feature>.constant.ts`.
- Repository interfaces: `I<X>Repository.ts`.

## Refactor Checklist

1. Inspect current imports, tests, docs, route ownership, and aliases before moving files.
2. Move one boundary at a time: feature internals, shared promotions, data ports, or route thinning.
3. Keep route files and shadcn primitives in their framework/tooling-owned locations.
4. Update imports, tests, and architecture docs in the same change.
5. Preserve feature barrels as composition roots only; do not route domain types or components through barrels.
6. Run `pnpm lint`, `pnpm test`, and `pnpm build` after code moves.
