# Zustand for global UI state, dialogs keyed by name

Status: accepted

## Context

Quick-add became a dialog, and more dialogs are coming (edit transaction in issue 06,
deactivate-confirm in 10/11) that should be openable from anywhere — a header button, a
shortcut, a row action. React-local `useState` colocated with each trigger doesn't serve
remote triggering, so we want a small global UI state layer. This is the project's first
client state store, so the shape here is the precedent for future dialogs.

## Decision

Introduce **zustand** as the store for **ephemeral global UI state** (`src/shared/stores/
ui-store.ts`). Dialogs are modelled as a single **`activeDialog: DialogName | null`** — one
dialog open at a time. A reusable `<Dialog name>` component (store-connected via a
`useDialog(name)` hook) is open when `name === activeDialog`; opening sets the name, closing
(overlay/Esc/X) clears it. Dialog names are a `const`-union (`DIALOG`), not a TS `enum`
(enums emit runtime code and clash with `verbatimModuleSyntax`).

The store is **name-only**: it globalizes *which* dialog is open, not its data. Data-carrying
dialogs get their data from where they are rendered (row props / TanStack Query / route
params). A typed payload channel can be added later **only if** a remote, data-carrying
trigger actually needs one.

## Consequences

- **SSR-singleton safety (the non-obvious constraint):** a module-level store is a singleton
  shared across requests on the server. This store must hold **only ephemeral client UI
  flags — never per-user data**, or state would leak between requests/users during SSR.
- The reusable `<Dialog>` is **store-connected, not strictly pure** — the coupling is
  confined to the `useDialog` hook, and the `isOpen` selector compares only against the
  dialog's own name so each dialog re-renders just when its own open-state flips.
- Single-active-dialog prevents modal-over-modal / focus-trap bugs; if simultaneous dialogs
  are ever needed, the model would change to a set/record.
