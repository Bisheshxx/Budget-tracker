// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { queryKeys } from '#/shared/lib/query-keys.ts'
import { createQueryHarness } from '../../../helpers/query-client.ts'
import { defaultPermissions } from '../../../helpers/household.ts'

const { updateSettings } = vi.hoisted(() => ({ updateSettings: vi.fn() }))

vi.mock('#/features/households', () => ({
  householdService: { updateSettings },
}))

const { useUpdateHouseholdSettings } =
  await import('#/features/households/hooks/use-update-household-settings.ts')

const settings = {
  name: 'Flat',
  currency: 'AUD' as const,
  periodStartDay: 25,
  timeZone: 'Pacific/Auckland',
  permissions: defaultPermissions,
}
const listKey = queryKeys.households.list('profile-1')

afterEach(() => vi.clearAllMocks())

describe('useUpdateHouseholdSettings', () => {
  it('saves and refreshes the Household list the ledger screens read', async () => {
    updateSettings.mockResolvedValue(undefined)
    const harness = createQueryHarness()
    harness.seed(listKey)

    const { result } = renderHook(() => useUpdateHouseholdSettings('house-1'), {
      wrapper: harness.wrapper,
    })
    await result.current.mutateAsync(settings)

    expect(updateSettings).toHaveBeenCalledWith('house-1', settings)
    expect(harness.isStale(listKey)).toBe(true)
  })

  it('refreshes nothing when the save is refused', async () => {
    updateSettings.mockRejectedValue(new Error('Only the admin'))
    const harness = createQueryHarness()
    harness.seed(listKey)

    const { result } = renderHook(() => useUpdateHouseholdSettings('house-1'), {
      wrapper: harness.wrapper,
    })

    await expect(result.current.mutateAsync(settings)).rejects.toThrow(
      'Only the admin',
    )
    expect(harness.isStale(listKey)).toBe(false)
  })
})
