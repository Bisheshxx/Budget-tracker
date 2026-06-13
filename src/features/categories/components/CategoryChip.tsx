import { CategoryIcon } from '#/features/categories/CategoryIcon'
import { cn } from '#/lib/utils'
import type { Category } from '#/features/categories/types'

// The standard category label: color dot + icon + name. Callers resolve the
// real Category (including the seeded Uncategorized row) and pass it in; the
// null branch is only a defensive fallback for the brief pre-load window.
export function CategoryChip({
  category,
  className,
}: {
  category: Category | null
  className?: string
}) {
  if (!category) {
    return <span className={className}>Uncategorized</span>
  }
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: category.colorHex }}
      />
      <CategoryIcon name={category.icon} className="size-4 shrink-0" />
      <span className="truncate">{category.name}</span>
    </span>
  )
}
