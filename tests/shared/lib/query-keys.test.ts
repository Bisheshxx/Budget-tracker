import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  invalidateCategoryViews,
  invalidateTransactionViews,
  queryKeys,
} from '#/shared/lib/query-keys.ts'

describe('queryKeys', () => {
  it('scopes every key to its owner', () => {
    expect(queryKeys.profile.byAuthUser('auth-1')).toEqual([
      'profile',
      'auth-1',
    ])
    expect(queryKeys.categories.list('u1')).toEqual(['categories', 'u1'])
    expect(queryKeys.categories.infinite('u1')).toEqual([
      'categories',
      'infinite',
      'u1',
    ])
    expect(queryKeys.recurring.list('u1')).toEqual(['recurring', 'u1'])
    expect(queryKeys.recurring.confirmedHistory('re-1')).toEqual([
      'recurring',
      'confirmed-history',
      're-1',
    ])
    expect(queryKeys.reports.report('u1', 'period', '2026-06')).toEqual([
      'reports',
      'u1',
      'period',
      '2026-06',
    ])
  })

  it.each([
    [
      queryKeys.transactions.infinite('u1'),
      queryKeys.transactions.infinite('u1', {
        from: '2026-06-01',
        to: '2026-07-01',
      }),
    ],
    [
      queryKeys.transactions.periodSummary('u1'),
      queryKeys.transactions.periodSummary('u1', {
        start: '2026-06-01',
        end: '2026-07-01',
      }),
    ],
    [
      queryKeys.recurring.recent('u1'),
      queryKeys.recurring.recent('u1', '2026-06-01'),
    ],
    [
      queryKeys.reports.all('u1'),
      queryKeys.reports.report('u1', 'period', '2026-06'),
    ],
  ])('the short form %j is a prefix of the full key %j', (prefix, full) => {
    expect(full.length).toBeGreaterThan(prefix.length)
    expect(full.slice(0, prefix.length)).toEqual([...prefix])
  })
})

// Seed a cache, run an invalidation helper, and report which keys went stale.
async function staleAfter(
  seed: readonly (readonly unknown[])[],
  run: (client: QueryClient) => Promise<unknown>,
) {
  const client = new QueryClient()
  for (const key of seed) client.setQueryData(key, 'cached')
  await run(client)
  return seed.filter((key) => client.getQueryState(key)?.isInvalidated)
}

describe('invalidation helpers', () => {
  const june = { from: '2026-06-01', to: '2026-07-01' }
  const juneRange = { start: '2026-06-01', end: '2026-07-01' }

  it('invalidateTransactionViews hits every window of that user only', async () => {
    const mine = [
      queryKeys.transactions.infinite('u1', june),
      queryKeys.transactions.periodSummary('u1', juneRange),
    ]
    const untouched = [
      queryKeys.transactions.infinite('u2', june),
      queryKeys.categories.list('u1'),
      queryKeys.reports.report('u1', 'period', '2026-06'),
    ]

    const stale = await staleAfter([...mine, ...untouched], (client) =>
      invalidateTransactionViews(client, 'u1'),
    )

    expect(stale).toEqual(mine)
  })

  it('invalidateCategoryViews hits both category caches of that user only', async () => {
    const mine = [
      queryKeys.categories.list('u1'),
      queryKeys.categories.infinite('u1'),
    ]
    const untouched = [
      queryKeys.categories.list('u2'),
      queryKeys.transactions.infinite('u1', june),
    ]

    const stale = await staleAfter([...mine, ...untouched], (client) =>
      invalidateCategoryViews(client, 'u1'),
    )

    expect(stale).toEqual(mine)
  })
})
