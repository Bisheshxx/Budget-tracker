import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCategoriesInfinite,
  useDeleteCategory,
} from '#/features/categories/use-categories'
import { CategoryIcon } from '#/features/categories/CategoryIcon'
import { CategoryCreateForm } from '#/features/categories/components/CategoryCreateForm'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Skeleton } from '#/components/ui/skeleton'
import type { Category } from '#/features/categories/types'

function useInfiniteScrollSentinel(
  onLoadMore: () => void,
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
) {
  const sentinelRef = useRef<HTMLLIElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) onLoadMore()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  return sentinelRef
}

// Manage categories directly inside the Dashboard's Categories card. The list
// is newest-created first and paged; system categories are read-only, while the
// user's own categories can be edited or deleted inline.
export function CategoryManager() {
  const {
    categories,
    loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useCategoriesInfinite()
  const [editing, setEditing] = useState<Category | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  // The category queued for the confirm modal.
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const sentinelRef = useInfiniteScrollSentinel(
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  )

  return (
    <>
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <CardTitle>Categories</CardTitle>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingDelete(null)
                setCreateOpen(true)
              }}
            >
              <Plus />
              New category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CategoryListSkeleton />
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven't created any categories yet.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col divide-y overflow-y-auto pr-1">
              {categories.map((category) => (
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

                  {category.isSystem ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      System
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => {
                          setPendingDelete(null)
                          setEditing(category)
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => setPendingDelete(category)}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </span>
                  )}
                </li>
              ))}
              <li ref={sentinelRef} aria-hidden />
              {isFetchingNextPage && (
                <li className="py-2 text-center text-sm text-muted-foreground">
                  Loading…
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteCategoryDialog
        category={pendingDelete}
        onClose={() => setPendingDelete(null)}
      />
      <CreateCategoryDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditCategoryDialog category={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function CategoryListSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-live="polite"
      className="flex max-h-80 flex-col divide-y overflow-hidden pr-1"
    >
      <span className="sr-only">Loading categories</span>
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex items-center justify-between gap-2 py-2">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Skeleton className="size-3 shrink-0 rounded-full" />
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className="h-4 w-28 max-w-full" />
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </span>
        </li>
      ))}
    </ul>
  )
}

function CreateCategoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
        </DialogHeader>
        <CategoryCreateForm
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function EditCategoryDialog({
  category,
  onClose,
}: {
  category: Category | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={category !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
        </DialogHeader>
        {category && (
          <CategoryCreateForm
            category={category}
            onSuccess={(updated) => {
              onClose()
              toast.success(`${updated.name} updated`)
            }}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// Delete confirmation modal. Kept local to the manager so category management
// stays contained in the Dashboard card.
function ConfirmDeleteCategoryDialog({
  category,
  onClose,
}: {
  category: Category | null
  onClose: () => void
}) {
  const deleteCategory = useDeleteCategory()
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    if (!category) return
    setError(null)
    try {
      await deleteCategory.mutateAsync(category)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete the category',
      )
    }
  }

  return (
    <Dialog
      open={category !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null)
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete category?</DialogTitle>
          <DialogDescription>
            Transactions in this category will move to Uncategorized.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setError(null)
                onClose()
              }}
              disabled={deleteCategory.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
