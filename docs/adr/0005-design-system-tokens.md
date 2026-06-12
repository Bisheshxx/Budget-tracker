# Semantic color tokens as the single source of design truth

## Status

accepted

## Context

The app's original visual language was a "coastal/lagoon" palette: teal-heavy
colors scattered as raw hex and `rgba()` values across `src/styles.css`, the
landing page, and chrome (`Header`, `Footer`, `ThemeToggle`). The shadcn UI
primitives (`Button`, `Card`, `Input`, …) already drew from semantic CSS-variable
tokens (`--background`, `--foreground`, `--primary`, `--border`, …), but the
landing page and a few chrome details hardcoded colors directly. That split meant
a palette change touched many files and risked drift — every new screen could
invent its own off-palette color.

We replaced the palette with a **"paper + teal"** scheme (warm off-white surfaces,
a teal accent, and dedicated green/red money colors), and want it to stay
consistent as features (dashboard, reports) are built.

## Decision

**All color flows through the semantic tokens defined in `src/styles.css`.
Components never write raw hex / `rgb()` / `rgba()`.** To recolor the app, edit
the tokens, not the screens.

- The palette is defined once per mode (`:root` and `.dark`) as `--paper-*`
  source values, plus money tokens `--income / --income-bg / --expense /
  --expense-bg`. The existing shadcn tokens (`--primary`, `--card`, `--border`,
  `--destructive`, …) and the legacy var names still referenced by chrome
  (`--sea-ink`, `--line`, `--header-bg`, `--lagoon`, …) are **mapped onto** the
  paper palette, so older components adopt the new look without edits.
- Money tokens are exposed as Tailwind utilities via `@theme inline`
  (`bg-income-bg`, `text-income`, `bg-expense-bg`, `text-expense`).
- Money is always rendered through `#/shared/components/Money` (and
  `MoneyBadge`), which formats integer cents via `formatMoney` in `#/lib/money`
  and applies the income/expense tones — so amounts read identically everywhere.
- An **ESLint guard** (`no-restricted-syntax` in `eslint.config.js`, scoped to
  `src/**/*.{ts,tsx}`) fails the build on raw hex / `rgb()` / `rgba()` literals in
  components. `var(--…)` is allowed because it points at a token; `styles.css`
  (where tokens are legitimately defined as hex) and the generated
  `database.types.ts` are out of scope.

## Consequences

- A palette change is a `styles.css` edit, not a codebase sweep; light/dark stay
  in sync because both modes define the same token set.
- New components must use semantic utilities (`bg-primary`,
  `text-muted-foreground`, `bg-card`, money tokens). Off-palette colors are caught
  by `pnpm lint` before they land.
- Domain color semantics (income = green, expense = red) live in the token layer
  and the shared `Money`/`MoneyBadge` components, not per screen.
- The coastal palette is gone; its old variable names survive only as aliases
  mapped onto the paper palette, which can be inlined away over time.
