# PRD: Budgeting App — V1 (Cashflow Awareness)

Status: ready-for-agent

> Domain language: see [CONTEXT.md](../../CONTEXT.md). Architecture: see [ADR 0001](../../docs/adr/0001-client-side-swappable-repositories.md).

## Problem Statement

I lose track of my finances. I don't have an easy, at-a-glance way to know how much money I earned and spent this week and this month, or how that compares to before. I want awareness and quick access — not a strict budget that nags me. I check this on the web today and want a native app later.

## Solution

A personal finance web app focused on **Cashflow awareness**. After a quick onboarding (currency + Period start day), I land on a dashboard that shows, for my current **Period**, how much came in, how much went out, and my **net** — plus a spend-by-category breakdown and recent transactions. Adding a transaction is a one-tap, effortless action. A secondary Reports view shows charts and a **Period Comparison** (this Period vs. last, as both a percentage and an absolute amount). My **Budget Target** appears as a soft mindset anchor, never a pass/fail verdict. Money I move to savings is simply not recorded — what I saved is derived from net Cashflow.

## User Stories

1. As a new visitor, I want to sign up with email and password, so that I can create an account.
2. As a returning user, I want to log in with email and password, so that I can access my data.
3. As a logged-in user, I want to log out, so that I can secure my account on shared devices.
4. As an unauthenticated user, I want to be redirected to login when I open a protected page, so that my data stays private.
5. As a brand-new user, I want to be taken to a one-screen Onboarding right after my first signup, so that my app is configured before I start.
6. As a user in Onboarding, I want to choose my currency, so that all amounts display correctly.
7. As a user in Onboarding, I want to set my Period start day, so that my monthly cycle matches my real pay/billing rhythm.
8. As a user in Onboarding, I want to optionally set my display name, grocery day, and Budget Target, so that I can personalise later without being forced to now.
9. As an onboarded user, I want to be blocked from re-entering Onboarding, so that I'm not asked to set up twice.
10. As a user who has not finished Onboarding, I want to be routed back to it instead of a broken dashboard, so that the app always has the settings it needs.
11. As a user, I want to land on a Dashboard showing my current Period's income in, expenses out, and net, so that I know my Cashflow at a glance.
12. As a user, I want the Dashboard to tell me how many days I am into the Period, so that I have timing context.
13. As a user, I want to see a spend-by-category breakdown for the current Period, so that I know where my money went.
14. As a user, I want to see my most recent transactions on the Dashboard, so that I can confirm what I just logged.
15. As a user, I want my Budget Target shown as a soft reference (not a pass/fail), so that I have a mindset anchor without being nagged.
16. As a user, I want a one-tap quick-add action on the Dashboard, so that logging spending is effortless.
17. As a user, I want to add an expense with amount, category, date, and note, so that I can record what I spent.
18. As a user, I want to add income with amount, date, and note, so that my Cashflow reflects money coming in.
19. As a user, I want to define a Recurring Expense (name, category, default amount, frequency weekly/monthly, anchor day), so that my fixed commitments like rent or gym are first-class objects.
19a. As a user, I want the Dashboard to prompt me to confirm a Recurring Expense when it's Due (pre-filled, with the amount/date editable), so that logging fixed costs is effortless while I stay in control of the real amount.
19b. As a user, I want to skip a Due occurrence, so that a month I didn't pay isn't recorded as spending.
19c. As a user, I want to deactivate a Recurring Expense (with a confirmation) instead of deleting it, so that I stop being prompted but keep all its history for analytics.
19d. As a user, I want a dedicated Recurring screen with an "Add Recurring Expense" button to manage my templates, so that I can create, edit, and deactivate them in one place.
20. As a user, I want amounts entered in my currency's normal units but stored precisely, so that I never see floating-point rounding errors.
21. As a user, I want to be prevented from saving a transaction with a zero or negative amount, so that my data stays valid.
22. As a user, I want a transaction to default to today's date, so that the common case is fast.
23. As a user, I want to edit an existing transaction, so that I can fix mistakes.
24. As a user, I want to delete a transaction, so that I can remove an erroneous entry.
25. As a user, I want my transactions assigned to a category, so that breakdowns are meaningful.
26. As a user, I want a set of sensible default categories available immediately, so that I can categorise without setup.
27. As a user, I want to create my own custom categories with a name, colour, and icon, so that the app fits how I think about money.
28. As a user, I want to delete my own custom categories, so that I can keep my list tidy.
29. As a user, I want to be prevented from deleting system categories, so that core categories like Uncategorized always exist.
30. As a user, I want a transaction whose category is deleted to fall back gracefully (become uncategorised), so that I never lose the transaction itself.
31. As a user, I want to open a Reports view, so that I can understand my spending over time.
32. As a user, I want to see my current Period compared with the previous Period, expressed as both a percentage and an absolute amount, so that I understand whether I'm spending more or less.
33. As a user, I want the comparison broken down per category, so that I can see which categories drove the change.
34. As a user, I want charts of income vs. expenses and category spend, so that I can read my finances visually.
35. As a user, I want to slice the current Period into its weeks, so that I can see weekly spending within the month.
36. As a user, I want a Settings screen, so that I can update currency, Period start day, grocery day, display name, and Budget Target after Onboarding.
37. As a user, I want my data to be private to me, so that no other user can read or change it.
38. As a user, I want amounts shown in my chosen currency throughout, so that the app feels localised to me.
39. As a developer, I want all data access behind swappable repository interfaces, so that I can later replace Supabase with my own API by changing one wiring point.

## Implementation Decisions

**Domain model & semantics** (canonical terms in [CONTEXT.md](../../CONTEXT.md))
- **Period** is the single budgeting unit: a monthly cycle anchored on `user_profiles.budget_period_start_day` (constrained 1–28). All targets, reports, and comparisons key off the Period.
- **Cashflow** (income in, expenses out, net) is the headline signal. **Budget Target** is a soft reference, never a pass/fail verdict.
- **Savings is not a tracked transaction.** The seeded `Savings` system category is **removed**. "What you saved" is derived from net Cashflow.
- **Recurring Expenses are first-class templates** (expenses only), not a per-transaction label. They use prompt-to-confirm and generate-on-read occurrences (no scheduler), are deactivated-not-deleted, and retain history for analytics. See [ADR 0006](../../docs/adr/0006-recurring-expenses-templates-and-data-retention.md). The old per-transaction `is_recurring` boolean is dropped; "recurring" is derived from `transactions.recurring_expense_id`.

**Schema** — use the schema from the project plan, with two amendments:
- Drop the `Savings` row from the seeded system categories. Seeded categories: Housing, Food, Transport, Health, Entertainment, Uncategorized.
- No new columns required. "Onboarded" is detected via `user_profiles.display_name IS NULL` (signup trigger leaves it null; Onboarding sets it). (Optional future: an explicit `onboarding_completed_at` — not in V1.)
- Money stored as integer cents (`amount_cents`), converted to/from display units at the edges only.
- A signup trigger auto-creates a blank `user_profiles` row; Onboarding fills required fields.
- **Recurring Expenses** (delivered last, in issues 09–11): drop the `transactions.is_recurring` boolean and add a `transactions.recurring_expense_id` FK; add a `recurring_expenses` table (name, category FK, default `amount_cents`, `frequency` weekly/monthly, single `anchor_day` with a frequency-keyed CHECK, `active`, `created_at`, `deactivated_at`) and a `recurring_expense_occurrences` table holding only resolved rows (`confirmed`/`skipped`). RLS mirrors `transactions`.

**Architecture** (per [ADR 0001](../../docs/adr/0001-client-side-swappable-repositories.md))
- Layering: **UI components → Services → Repositories (interfaces) → data source**. Components call services only; they never touch a data client directly.
- **Repositories run client-side** for V1 (browser Supabase JS client carries the user's session; RLS enforces ownership). A single wiring container is acceptable because each browser serves one user.
- **Data renders client-side** via TanStack Query wrapping services. SSR for app data is **deferred** (functionality over SEO for V1); the chosen architecture does not block adding SSR later.
- The future swap to an own backend uses **axios**-based repository implementations selected at the wiring point. The "swap one file" promise holds for the **data source**; **auth is a separate, known second swap** and is not part of that one file.
- **No AI in V1.** No Anthropic SDK, no secret keys in the client. `report_snapshots` may exist for cached numeric reports, but `ai_summary` regeneration is out of scope. (When AI lands, it runs server-side / in the future backend.)

**Modules to build**
- Repository interfaces: `ITransactionRepository`, `ICategoryRepository`, `IReportRepository`, `IRecurringExpenseRepository` (+ an auth abstraction so the future auth swap is contained).
- Supabase repository implementations behind those interfaces.
- Services holding business logic: transaction add/edit/delete + Cashflow summary; category create/delete with system-category protection; report/Period-comparison computation.
- A single wiring container that selects implementations.
- Pure domain helpers: Period-boundary resolution (date + start day → Period range, including month-flip and the 1–28 clamp), `getPeriodKey`, cents↔display formatting, Period-Comparison delta computation (percentage **and** absolute amount, overall and per category).
- Routes/surfaces: Login, Signup, Onboarding (gated), Dashboard (primary), Reports (charts + comparison), Settings.

**Key behaviours**
- **Onboarding is gated**: after first signup the user must complete Onboarding (required: currency + Period start day) before the Dashboard is reachable; an onboarded-but-unconfigured user is routed to Onboarding; an unauthenticated user is routed to Login.
- **Period Comparison** reports this Period vs. previous Period as both % change and absolute amount, overall and per category.
- Deleting a custom category sets affected transactions' `category_id` to null (treated as Uncategorized in the UI). System categories cannot be deleted.
- Transaction amount must be > 0; type is income or expense; date defaults to today.

## Testing Decisions

- **Good tests assert external behaviour, not implementation.** Test what a service returns/does given inputs, not how it calls the repository. Tests must survive the future Supabase→axios swap without changes.
- **Primary seam — Service layer with in-memory fake repositories.** Because services depend only on repository interfaces, inject fakes to test: Cashflow totals (income/expenses/net), spend-by-category grouping, Period-Comparison deltas (% and amount, overall and per category), amount-must-be-positive validation, and category-delete fallback to Uncategorized. Fast, deterministic, Supabase-free.
- **Pure-function unit tests** for the riskiest logic: Period-boundary resolution (start-day anchoring, month-flip, 1–28 clamp), `getPeriodKey`, and cents↔display formatting.
- **Out of the unit suite:** Supabase repository implementations (thin data access; RLS cannot be exercised in unit tests — verify manually/integration later) and exhaustive React component tests. At most one smoke test of the quick-add → Dashboard loop.
- **Tooling/prior art:** Vitest (`pnpm test`), already configured in the repo. New tests follow existing Vitest setup.

## Out of Scope

- AI-generated spending overviews (Anthropic), the prompt builder, and `ai_summary` regeneration — deferred to the future backend.
- Server-side rendering of app data / SEO — deferred until SEO matters.
- Auto-generated recurring transactions (silent creation without confirmation), a backend scheduler/cron, yearly frequency, and recurring *income* — Recurring Expenses use client-side generate-on-read with prompt-to-confirm; see [ADR 0006](../../docs/adr/0006-recurring-expenses-templates-and-data-retention.md).
- Tracking savings transfers or a Savings category/input.
- OAuth (Google/GitHub) sign-in — email/password only in V1 (OAuth is a later add).
- The own-backend migration itself (axios repository implementations, auth swap, dropping RLS) — architecture is prepared for it, but it is not built in V1.
- Native app — web first.
- Multi-account / multi-currency-per-user, data export/import.

## Further Notes

- Respect the canonical vocabulary in [CONTEXT.md](../../CONTEXT.md): Period, Budget Target, Cashflow, Savings (derived), Period Comparison, Onboarding, Recurring Expense, Recurring Occurrence, Due. Avoid the listed synonyms (e.g. don't call the budget unit a "month"; don't call savings a transaction).
- The "swap one file" migration promise should be communicated accurately: it covers the **data source**, not auth. Keep auth behind its own abstraction so that swap is also contained, but do not claim it is the same single change.
- Money never stored as float — integer cents end to end, divided/multiplied only at display/input boundaries.
- `Uncategorized` is a real system category row, never a hardcoded magic string.
