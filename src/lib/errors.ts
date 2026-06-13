import { toast } from 'sonner'

// Shared error helpers. `getErrorMessage` centralizes the
// `err instanceof Error ? err.message : fallback` idiom repeated across the app;
// `notifyError` is the single client-side surface for unexpected failures, used
// by the global TanStack Query cache handlers (see root-provider.tsx).

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.trim()) return err
  return fallback
}

// Surface an error as a toast. No-ops on the server (sonner is client-only and
// getContext() runs during SSR), where we log instead so failures aren't silent.
export function notifyError(err: unknown, fallback?: string): void {
  if (typeof window === 'undefined') {
    console.error(err)
    return
  }
  toast.error(getErrorMessage(err, fallback))
}
