# Categories management + picker

Status: ready-for-agent
Type: AFK

## Parent

[Budgeting App — V1 PRD](../PRD.md)

## What to build

Full category support end-to-end, plus integration into the add-transaction flow.

- `ICategoryRepository` → Supabase implementation → `CategoryService` → container.
- List the user's available categories: system categories (`user_id IS NULL`) + the user's own.
- Create custom categories (name, colour, icon); delete own categories. System categories are protected from deletion (enforced by RLS and surfaced gracefully in the UI).
- Wire a category picker into the quick-add/edit transaction form.
- Deleting a category that has transactions sets those transactions' `category_id` to null; such transactions are shown as Uncategorized. `Uncategorized` is a real system row, never a hardcoded string.

## Acceptance criteria

- [ ] A user sees system + own categories in the picker
- [ ] A user can create a custom category with name, colour, and icon
- [ ] A user can delete their own categories but not system categories
- [ ] Deleting a category in use leaves its transactions intact, shown as Uncategorized
- [ ] Transactions can be assigned a category at add time
- [ ] Service-layer tests with a fake repository cover system-category delete protection and the delete→Uncategorized fallback

## Blocked by

- 03 — Quick-add transaction + recent list
