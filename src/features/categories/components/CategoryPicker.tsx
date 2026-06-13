import { Plus } from 'lucide-react'
import { useCategories } from '#/features/categories/use-categories'
import { CategoryIcon } from '#/features/categories/CategoryIcon'
import { Button } from '#/components/ui/button'
import {
  SelectMenu,
  SelectMenuContent,
  SelectMenuItem,
  SelectMenuTrigger,
} from '#/components/ui/select-menu'
import type { Category } from '#/features/categories/types'

// Radix Select disallows an empty-string item value, so Uncategorized uses a
// sentinel internally and maps back to '' (→ null transaction.category_id).
const UNCATEGORIZED = '__uncategorized__'

// RHF-friendly category picker. `value` is a category id, or '' for Uncategorized.
// "＋ New category" delegates to `onCreateNew` (the parent runs the dialog swap).
export function CategoryPicker({
  value,
  onChange,
  onCreateNew,
}: {
  value: string
  onChange: (id: string) => void
  onCreateNew: () => void
}) {
  const { categories } = useCategories()
  // The seeded Uncategorized row is represented by the sentinel item, not listed.
  const selectable = categories.filter(
    (c) => !(c.isSystem && c.name === 'Uncategorized'),
  )
  const selected = value ? (categories.find((c) => c.id === value) ?? null) : null

  return (
    <div className="flex items-center gap-2">
      <SelectMenu
        value={value === '' ? UNCATEGORIZED : value}
        onValueChange={(v) => onChange(v === UNCATEGORIZED ? '' : v)}
      >
        <SelectMenuTrigger className="flex-1">
          {selected ? (
            <CategoryRow category={selected} />
          ) : (
            <span className="text-muted-foreground">Uncategorized</span>
          )}
        </SelectMenuTrigger>
        <SelectMenuContent>
          <SelectMenuItem value={UNCATEGORIZED}>Uncategorized</SelectMenuItem>
          {selectable.map((c) => (
            <SelectMenuItem key={c.id} value={c.id}>
              <CategoryRow category={c} />
            </SelectMenuItem>
          ))}
        </SelectMenuContent>
      </SelectMenu>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onCreateNew}
        aria-label="New category"
      >
        <Plus />
      </Button>
    </div>
  )
}

function CategoryRow({ category }: { category: Category }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: category.colorHex }}
      />
      <CategoryIcon name={category.icon} className="size-4" />
      <span>{category.name}</span>
    </span>
  )
}
