---
name: commit
description: Commit working-tree changes as separate logical commits with conventional-commit messages, then optionally push. Use when the user asks to commit, "commit my changes", "commit and push", or wants changes split into clean per-concern commits.
---

# Commit

Group the working tree into **separate logical commits** (one per feature/concern), write
conventional-commit messages, and push if asked. Never add AI co-author trailers or
"Generated with ..." lines.

## Workflow

1. **Survey.** Run `git status` and `git diff` (and `git diff --staged`). Read enough of the diff to
   understand *what* changed, not just file names.

2. **Branch guard.** If on the default branch (`main`/`master`), do **not** commit there — create a
   branch first (`git switch -c <descriptive-name>`) unless the user explicitly said to commit on it.
   Confirm the branch name choice if it's non-obvious.

3. **Group into commits.** Partition changes by concern: a bug fix, a feature, a refactor, a
   migration, docs, and a dependency bump are usually separate commits. A new dependency belongs with
   the feature that introduced it (include its `package.json`/lockfile in that commit). Stage each
   group explicitly with `git add <paths>` (per-file, or `git add -p` for split hunks) — avoid
   `git add -A` when multiple concerns are mixed.

4. **Message per commit** — conventional commits:
   ```
   type(scope): imperative subject, lower-case, no trailing period

   Body: what changed and *why* (the reasoning, not a file list). Wrap ~72 cols.
   Bullets for multiple distinct points.
   ```
   Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`, `ci`, `style`.
   Scope = the feature/area (e.g. `db`, `auth`, `error-handling`). Keep the subject ≤ ~70 chars.

5. **Never add AI attribution trailers** such as `Co-Authored-By: Claude`,
   `Co-Authored-By: Codex`, or any "Generated with ..." line. Use the user's own git identity.

6. **Commit** each group: `git commit -m "<subject>" -m "<body>"` (or a heredoc for long bodies).
   Then show `git log --oneline -<n>` so the user sees the result.

7. **Push only if asked** (or if the user said "commit and push"). Push to the current branch's
   upstream; if none exists, `git push -u origin <branch>` and surface the PR-create URL the remote
   prints.

## Notes

- Pre-commit hooks may reformat or block — if a commit fails, read the hook output, fix, re-stage,
  retry. Don't bypass with `--no-verify` unless the user says so.
- Don't run `git add`/`commit`/`push` for unrelated stray changes you didn't intend to include —
  check `git status` is clean of surprises before each commit.
- If the diff is one cohesive change, a single commit is correct — "separate per concern" means
  don't *bundle unrelated* work, not artificially split one feature.
