# Domain types in features, repository ports in data

## Status

accepted

## Context

[ADR 0001](./0001-client-side-swappable-repositories.md) put data access behind repository **interfaces** so the data source can later swap from Supabase to an axios/REST backend by changing one wiring file. [ADR 0002](./0002-feature-based-modules.md) grouped application code by feature but left the repository layer — interfaces and implementations alike — in `src/data/<feature>/`.

In practice each `src/data/<feature>/<feature>-repository.ts` was a **pure type file**: the repository interface (`IAuthRepository`, `IProfileRepository`) plus the domain entity types it traffics in (`AuthSession`, `Credentials`, `UserProfile`, `ProfileUpdate`, `PaydayFrequency`). Two things were wrong with that single file:

1. The **domain entity types** are feature vocabulary — spoken by services, hooks, components, _and_ the repository. Burying them in the lowest layer made features import their own vocabulary _up_ from `#/data/...`.
2. The **repository interface** is a persistence contract. It belongs with the implementation that fulfils it, so `src/data/<feature>/` can tell the whole story — contract, implementation, and which implementation is active — in one folder.

## Decision

Split the two concerns by their natural owner:

- **Domain entity types live in the feature** as a leaf module — either `src/features/<feature>/types.ts` or a structured path such as `src/features/<feature>/types/<feature>.type.ts` (e.g. `UserProfile`, `ProfileUpdate`, `PaydayFrequency`, `AuthUser`, `AuthSession`, `Credentials`). This file imports nothing from `data/`; it is a leaf.
- **The repository interface (port) lives in data, in its own file named after the interface** — `src/data/<feature>/IXxxRepository.ts` (`IAuthRepository.ts`, `IProfileRepository.ts`). It imports its domain types from that feature type leaf, so the data adapter speaks the domain's language while the domain never depends on data.
- **File-naming exception:** the interface file is **PascalCase** named after its single export (like a component file), against the otherwise-kebab-case rule for non-component files.
- The data folder stays flat by default: `I<X>Repository.ts` is the port, `supabase-<feature>-repository.ts` is the current implementation, and `index.ts` is the only public swap point imported as `#/data/<feature>`. Add subfolders only when a data domain has enough ports or implementations to justify organizing more than these three files.

## Consequences

- A feature owns service code, hook(s), schema, domain types, `components/`, and its `index.ts` barrel. The `data/<feature>/` folder owns the **port** (`IXxxRepository.ts`), the **implementation**, and the **swap-point** `index.ts`.
- Keep the data layer consistent across domains; do not structure only one data folder such as `src/data/transactions/` unless the same convention is adopted for all data domains.
- Services import the port from `#/data/<feature>/IXxxRepository` and domain types from the feature's leaf type module. Service unit tests inject a fake repository typed against that port (e.g. `tests/features/profile/profile-service.test.ts`); the Supabase data-layer test is unaffected.
- No import cycle: the feature type module is a leaf, the data layer imports only that leaf (never the feature **barrel**), and the barrel imports the active repository from `#/data/<feature>`.
- No runtime/behaviour change — this was a type relocation plus import rewiring.
