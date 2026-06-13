# Transaction edit + delete

Status: ready-for-agent
Type: AFK

## Parent

[Budgeting App — V1 PRD](../PRD.md)

## What to build

Complete transaction CRUD by adding edit and delete to the existing add/list flow.

- Edit an existing transaction (amount, type, category, date, note) through `TransactionService` / `ITransactionRepository`.
- Delete a transaction.
- Lists and the current-Period summary reflect edits/deletes.

## Acceptance criteria

- [ ] A user can edit any field of an existing transaction and see the change reflected
- [ ] Edited amounts remain stored as integer cents and reject non-positive values
- [ ] A user can delete a transaction and it disappears from lists/summaries
- [ ] Edit/delete go through the repository interface; no data client in components
- [ ] Service-layer tests with a fake repository cover update and delete behavior

## Blocked by

- 03 — Quick-add transaction + recent list
