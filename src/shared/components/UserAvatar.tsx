import { cn } from '#/lib/utils.ts'

const sizeClasses = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-12 text-base',
} as const

interface UserAvatarProps {
  /** Preferred source for initials (e.g. a display name). */
  name?: string | null
  /** Fallback source for initials when no name is set. */
  email?: string | null
  /** Optional avatar image; falls back to initials when absent or it fails. */
  imageUrl?: string | null
  size?: keyof typeof sizeClasses
  className?: string
}

/** Derive up to two uppercase initials from a name or, failing that, an email. */
function initialsFrom(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split('@')[0] || ''
  if (!source) return '?'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  const letters =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : source.slice(0, 2)
  return letters.toUpperCase()
}

/**
 * A circular user avatar that renders an image when available and otherwise
 * falls back to the user's initials. Lives in shared/ since multiple features
 * (header, settings, …) surface the signed-in user.
 */
export function UserAvatar({
  name,
  email,
  imageUrl,
  size = 'md',
  className,
}: UserAvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-primary/10 align-middle font-medium leading-none text-primary',
        sizeClasses[size],
        className,
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name ?? email ?? 'User avatar'}
          className="size-full object-cover"
        />
      ) : (
        initialsFrom(name, email)
      )}
    </span>
  )
}
