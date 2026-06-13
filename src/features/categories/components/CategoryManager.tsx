import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  useCategories,
  useDeleteCategory,
} from '#/features/categories/use-categories'
import { CategoryIcon } from '#/features/categories/CategoryIcon'
import { CategoryCreateForm } from '#/features/categories/components/CategoryCreateForm'
import { Button } from '#/components/ui/button'
import type { Category } from '#/features/categories/types'

// Manage the user's own categories: list, create, and delete. Lives inside the
// "Categories" dialog. System categories are read-only (no delete) — they're
// shown for context but can't be removed. The create form is reused inline
// (toggled by `creating`), not via its own store dialog.
export function CategoryManager() {
  const { categories, loading } = useCategories()
  const deleteCategory = useDeleteCategory()
  const [creating, setCreating] = useState(false)
  // The category awaiting delete confirmation (inline, no nested dialog).
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const own = categories.filter((c) => !c.isSystem)

  async function onDelete(category: Category) {
    setError(null)
    try {
      await deleteCategory.mutateAsync(category)
      setConfirmId(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete the category',
      )
    }
  }

  if (creating) {
    return (
      <CategoryCreateForm
        onSuccess={() => setCreating(false)}
        onCancel={() => setCreating(false)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : own.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven't created any categories yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y">
          {own.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: category.colorHex }}
                />
                <CategoryIcon name={category.icon} className="size-4" />
                <span className="text-sm">{category.name}</span>
              </span>

              {confirmId === category.id ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Delete?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(category)}
                    disabled={deleteCategory.isPending}
                  >
                    {deleteCategory.isPending ? 'Deleting…' : 'Confirm'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmId(null)}
                    disabled={deleteCategory.isPending}
                  >
                    Cancel
                  </Button>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => {
                    setError(null)
                    setConfirmId(category.id)
                  }}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setError(null)
          setConfirmId(null)
          setCreating(true)
        }}
      >
        <Plus />
        New category
      </Button>
    </div>
  )
}
