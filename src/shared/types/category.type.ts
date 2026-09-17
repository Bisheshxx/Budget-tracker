// Domain types for categories — a cross-feature vocabulary (categories, transactions,
// recurring, and reports all speak it), so it lives in shared rather than a single
// feature. The persistence port lives in #/data/categories/ICategoryRepository. See
// docs/adr/0004 and docs/adr/0009.

export interface Category {
  id: string
  /** Null = a system/preset category visible to everyone; otherwise the owner's profile id. */
  userId: string | null
  name: string
  colorHex: string
  /** A lucide icon name (e.g. 'home'), or null. */
  icon: string | null
  isSystem: boolean
  isDefault: boolean
  createdAt: string
}

// The fields a create writes. System categories are seeded, never created here.
export interface CategoryCreate {
  userId: string
  name: string
  colorHex: string
  icon: string | null
}

// The editable fields on a user's own category. System categories are seeded
// and read-only; the service guards that before calling the repository.
export interface CategoryUpdate {
  name: string
  colorHex: string
  icon: string | null
}

export interface CategoryPageCursor {
  createdAt: string
  id: string
}

export interface CategoryPageRequest {
  limit: number
  cursor?: CategoryPageCursor
}
