// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { useUiStore } from '#/shared/stores/ui-store.ts'
import { household, member } from '../../../helpers/household.ts'

const { useHouseholdMembers, remove, transferAdmin, leave, toast } = vi.hoisted(
  () => ({
    useHouseholdMembers: vi.fn(),
    remove: vi.fn(),
    transferAdmin: vi.fn(),
    leave: vi.fn(),
    toast: { success: vi.fn(), error: vi.fn() },
  }),
)

vi.mock('sonner', () => ({ toast }))
vi.mock('#/features/households/hooks/use-household-members', () => ({
  useHouseholdMembers,
  useMembershipMutations: () => ({
    remove: { mutateAsync: remove, isPending: false },
    transferAdmin: { mutateAsync: transferAdmin, isPending: false },
    leave: { mutateAsync: leave, isPending: false },
  }),
}))

const { HouseholdMembers } =
  await import('#/features/households/components/HouseholdMembers.tsx')

const me = member({
  profileId: 'profile-1',
  displayName: 'Alex',
  role: 'admin',
})
const sam = member({ profileId: 'profile-2', displayName: 'Sam' })

const asAdmin = household({ id: 'flat', role: 'admin' })
const asContributor = household({ id: 'flat', role: 'contributor' })

function loaded(members: ReturnType<typeof member>[]) {
  useHouseholdMembers.mockReturnValue({
    data: members,
    isLoading: false,
    isError: false,
  })
}

function openActionsFor(name: string) {
  fireEvent.keyDown(
    screen.getByRole('button', { name: `Actions for ${name}` }),
    { key: 'Enter' },
  )
}

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.hasPointerCapture = () => false
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  useUiStore.setState({ activeDialog: null })
})

describe('HouseholdMembers', () => {
  it('lists the members, marking the admin and the current user', () => {
    loaded([me, sam])

    render(<HouseholdMembers household={asAdmin} profileId="profile-1" />)

    expect(screen.getByText('Alex')).toBeTruthy()
    expect(screen.getByText('(you)')).toBeTruthy()
    expect(screen.getByText('Sam')).toBeTruthy()
    expect(screen.getAllByText('Admin')).toHaveLength(1)
    expect(useHouseholdMembers).toHaveBeenCalledWith('flat')
  })

  it('offers member actions to the admin, but never on themselves', () => {
    loaded([me, sam])

    render(<HouseholdMembers household={asAdmin} profileId="profile-1" />)

    expect(screen.getByRole('button', { name: 'Actions for Sam' })).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Actions for Alex' }),
    ).toBeNull()
  })

  it('offers a contributor no member actions', () => {
    loaded([me, sam])

    render(<HouseholdMembers household={asContributor} profileId="profile-2" />)

    expect(screen.queryByRole('button', { name: /Actions for/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Leave group' })).toBeTruthy()
  })

  it('removes a member only after confirmation', async () => {
    loaded([me, sam])
    remove.mockResolvedValue(undefined)
    render(<HouseholdMembers household={asAdmin} profileId="profile-1" />)

    openActionsFor('Sam')
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Remove from group' }),
    )

    expect(await screen.findByText('Remove Sam?')).toBeTruthy()
    expect(remove).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(remove).toHaveBeenCalledWith('profile-2'))
    await waitFor(() => expect(useUiStore.getState().activeDialog).toBeNull())
    expect(toast.success).toHaveBeenCalledWith('Sam removed')
  })

  it('hands over the admin role after confirmation', async () => {
    loaded([me, sam])
    transferAdmin.mockResolvedValue(undefined)
    render(<HouseholdMembers household={asAdmin} profileId="profile-1" />)

    openActionsFor('Sam')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Make admin' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Make admin' }))

    await waitFor(() => expect(transferAdmin).toHaveBeenCalledWith('profile-2'))
  })

  it('cancelling leaves everything as it was', async () => {
    loaded([me, sam])
    render(<HouseholdMembers household={asAdmin} profileId="profile-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Leave group' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(leave).not.toHaveBeenCalled()
    expect(useUiStore.getState().activeDialog).toBeNull()
  })

  it('leaves a group that still has other members without deleting it', async () => {
    loaded([me, sam])
    leave.mockResolvedValue(undefined)
    render(<HouseholdMembers household={asContributor} profileId="profile-2" />)

    fireEvent.click(screen.getByRole('button', { name: 'Leave group' }))

    expect(await screen.findByText('Leave Flat?')).toBeTruthy()
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Leave group' }).at(-1)!,
    )

    await waitFor(() => expect(leave).toHaveBeenCalledWith(false))
    expect(toast.success).toHaveBeenCalledWith('You left Flat')
  })

  it('warns the last member that leaving deletes the group', async () => {
    loaded([me])
    leave.mockResolvedValue(undefined)
    render(<HouseholdMembers household={asAdmin} profileId="profile-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Leave group' }))

    expect(await screen.findByText('Delete Flat?')).toBeTruthy()
    expect(screen.getByText(/This cannot be undone/)).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'Leave and delete group' }),
    )

    await waitFor(() => expect(leave).toHaveBeenCalledWith(true))
    expect(toast.success).toHaveBeenCalledWith('Flat deleted')
  })

  it('keeps the confirmation open and reports a refused change', async () => {
    loaded([me, sam])
    remove.mockRejectedValue(new Error('Only the admin can remove members'))
    render(<HouseholdMembers household={asAdmin} profileId="profile-1" />)

    openActionsFor('Sam')
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Remove from group' }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Only the admin can remove members',
      ),
    )
    expect(useUiStore.getState().activeDialog).toBe(
      'confirmHouseholdMemberAction',
    )
  })

  it('does not offer to leave before the members have loaded', () => {
    useHouseholdMembers.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    })

    render(<HouseholdMembers household={asAdmin} profileId="profile-1" />)

    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Leave group' })
        .disabled,
    ).toBe(true)
  })
})
