// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { queryKeys } from '#/shared/lib/query-keys.ts'
import { createQueryHarness } from '../../../helpers/query-client.ts'

const { useProfile, householdService } = vi.hoisted(() => ({
  useProfile: vi.fn(),
  householdService: {
    listPendingInvites: vi.fn(),
    createInvite: vi.fn(),
    revokeInvite: vi.fn(),
    previewInvite: vi.fn(),
    acceptInvite: vi.fn(),
  },
}))

vi.mock('#/shared/hooks/use-profile', () => ({ useProfile }))
vi.mock('#/features/households', () => ({ householdService }))

const { useAcceptInvite, useHouseholdInvites, useInvitePreview } =
  await import('#/features/households/hooks/use-household-invites.ts')

const invitesKey = queryKeys.households.invites('house-1')
const listKey = queryKeys.households.list('profile-1')
const storedActive = () =>
  window.localStorage.getItem('budget:active-household:profile-1')

const pendingInvite = {
  id: 'invite-1',
  createdAt: '2026-11-12T00:00:00.000Z',
  expiresAt: '2026-11-19T00:00:00.000Z',
}

afterEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

describe('useHouseholdInvites', () => {
  it("loads that Household's unused invites", async () => {
    householdService.listPendingInvites.mockResolvedValue([pendingInvite])
    const harness = createQueryHarness()

    const { result } = renderHook(() => useHouseholdInvites('house-1'), {
      wrapper: harness.wrapper,
    })

    await waitFor(() =>
      expect(result.current.pending.data).toEqual([pendingInvite]),
    )
    expect(householdService.listPendingInvites).toHaveBeenCalledWith('house-1')
  })

  it('creating a link returns its token and refreshes the list', async () => {
    householdService.listPendingInvites.mockResolvedValue([])
    householdService.createInvite.mockResolvedValue({
      id: 'invite-2',
      token: 'secret',
      expiresAt: '2026-11-20T00:00:00.000Z',
    })
    const harness = createQueryHarness()
    const { result } = renderHook(() => useHouseholdInvites('house-1'), {
      wrapper: harness.wrapper,
    })
    await waitFor(() => expect(result.current.pending.isSuccess).toBe(true))

    const created = await result.current.create.mutateAsync()

    expect(created.token).toBe('secret')
    expect(householdService.createInvite).toHaveBeenCalledWith('house-1')
    // Invalidation refetches the mounted query: asked for twice in total.
    await waitFor(() =>
      expect(householdService.listPendingInvites).toHaveBeenCalledTimes(2),
    )
  })

  it('revoking a link refreshes the list', async () => {
    householdService.listPendingInvites.mockResolvedValue([pendingInvite])
    householdService.revokeInvite.mockResolvedValue(undefined)
    const harness = createQueryHarness()
    const { result } = renderHook(() => useHouseholdInvites('house-1'), {
      wrapper: harness.wrapper,
    })
    await waitFor(() => expect(result.current.pending.isSuccess).toBe(true))

    await result.current.revoke.mutateAsync('invite-1')

    expect(householdService.revokeInvite).toHaveBeenCalledWith('invite-1')
    await waitFor(() =>
      expect(householdService.listPendingInvites).toHaveBeenCalledTimes(2),
    )
    expect(harness.client.getQueryState(invitesKey)).toBeDefined()
  })
})

describe('useInvitePreview', () => {
  it('looks the invite up by token', async () => {
    const preview = {
      householdId: 'house-1',
      householdName: 'Flat',
      invitedBy: 'Alex',
      expiresAt: '2026-11-19T00:00:00.000Z',
    }
    householdService.previewInvite.mockResolvedValue(preview)
    const harness = createQueryHarness()

    const { result } = renderHook(() => useInvitePreview('secret'), {
      wrapper: harness.wrapper,
    })

    await waitFor(() => expect(result.current.data).toEqual(preview))
    expect(householdService.previewInvite).toHaveBeenCalledWith('secret')
  })

  it('reports a dead link without retrying', async () => {
    householdService.previewInvite.mockRejectedValue(new Error('expired'))
    const harness = createQueryHarness()

    const { result } = renderHook(() => useInvitePreview('secret'), {
      wrapper: harness.wrapper,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(householdService.previewInvite).toHaveBeenCalledTimes(1)
  })
})

describe('useAcceptInvite', () => {
  it('joins, refreshes the Household list and switches to the group', async () => {
    useProfile.mockReturnValue({ profile: { id: 'profile-1' } })
    householdService.acceptInvite.mockResolvedValue('house-9')
    const harness = createQueryHarness()
    harness.seed(listKey)

    const { result } = renderHook(() => useAcceptInvite(), {
      wrapper: harness.wrapper,
    })
    await result.current.mutateAsync('secret')

    expect(householdService.acceptInvite).toHaveBeenCalledWith('secret')
    expect(harness.isStale(listKey)).toBe(true)
    expect(storedActive()).toBe('house-9')
  })

  it('does not switch when joining fails', async () => {
    useProfile.mockReturnValue({ profile: { id: 'profile-1' } })
    householdService.acceptInvite.mockRejectedValue(new Error('expired'))
    const harness = createQueryHarness()
    harness.seed(listKey)

    const { result } = renderHook(() => useAcceptInvite(), {
      wrapper: harness.wrapper,
    })

    await expect(result.current.mutateAsync('secret')).rejects.toThrow(
      'expired',
    )
    expect(harness.isStale(listKey)).toBe(false)
    expect(storedActive()).toBeNull()
  })
})
