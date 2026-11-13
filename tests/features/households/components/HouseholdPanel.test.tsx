// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useUiStore } from '#/shared/stores/ui-store.ts'
import { defaultPermissions, household } from '../../../helpers/household.ts'

const { useHouseholds, useProfile } = vi.hoisted(() => ({
  useHouseholds: vi.fn(),
  useProfile: vi.fn(),
}))

vi.mock('#/shared/hooks/use-households', () => ({ useHouseholds }))
vi.mock('#/shared/hooks/use-profile', () => ({ useProfile }))
// Keep the real "who may invite" rule; nothing here touches the backend.
vi.mock('#/features/households', async () => {
  const { HouseholdService } =
    await import('#/features/households/services/household-service.ts')
  const { fakeHouseholdRepo } = await import('../../../helpers/household.ts')
  return { householdService: new HouseholdService(fakeHouseholdRepo()) }
})
vi.mock('#/features/households/components/HouseholdSettingsForm', () => ({
  HouseholdSettingsForm: () => <div>settings form</div>,
}))
vi.mock('#/features/households/components/HouseholdMembers', () => ({
  HouseholdMembers: ({ profileId }: { profileId: string }) => (
    <div>members for {profileId}</div>
  ),
}))
vi.mock('#/features/households/components/HouseholdInvites', () => ({
  HouseholdInvites: () => <div>invites</div>,
}))

const { HouseholdPanel } =
  await import('#/features/households/components/HouseholdPanel.tsx')

function show(active: ReturnType<typeof household> | null) {
  useHouseholds.mockReturnValue({ active })
  useProfile.mockReturnValue({ profile: { id: 'profile-1' } })
  return render(<HouseholdPanel />)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  useUiStore.setState({ activeDialog: null })
})

describe('HouseholdPanel', () => {
  it('renders nothing until the active Household has loaded', () => {
    const { container } = show(null)

    expect(container.innerHTML).toBe('')
  })

  it('offers to start a group from the Personal household', () => {
    show(household({ isPersonal: true, role: 'admin', name: 'Personal' }))

    fireEvent.click(screen.getByRole('button', { name: 'New group' }))

    expect(useUiStore.getState().activeDialog).toBe('createHousehold')
    expect(screen.queryByText('settings form')).toBeNull()
    expect(screen.queryByText(/members for/)).toBeNull()
  })

  it('gives the admin settings, members and invites', () => {
    show(household({ role: 'admin' }))

    expect(screen.getByText('settings form')).toBeTruthy()
    expect(screen.getByText('members for profile-1')).toBeTruthy()
    expect(screen.getByText('invites')).toBeTruthy()
  })

  it('gives a contributor the members only', () => {
    show(household())

    expect(screen.getByText('members for profile-1')).toBeTruthy()
    expect(screen.queryByText('settings form')).toBeNull()
    expect(screen.queryByText('invites')).toBeNull()
  })

  it('adds invites for a contributor when the group allows it', () => {
    show(
      household({
        permissions: { ...defaultPermissions, contributorsCanInvite: true },
      }),
    )

    expect(screen.getByText('invites')).toBeTruthy()
    expect(screen.queryByText('settings form')).toBeNull()
  })
})
