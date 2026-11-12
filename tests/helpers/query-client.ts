import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'

// A fresh QueryClient (retries off, so failures surface fast) plus the wrapper
// that provides it — for hook tests that need to seed or inspect the cache.
export function createQueryHarness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
  /** Seed `keys` with placeholder data so an invalidation is observable. */
  function seed(...keys: readonly (readonly unknown[])[]) {
    for (const key of keys) client.setQueryData(key, [])
  }
  function isStale(key: readonly unknown[]) {
    return client.getQueryState(key)?.isInvalidated === true
  }
  return { client, wrapper, seed, isStale }
}
