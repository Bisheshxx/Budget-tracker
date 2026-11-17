// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

const { useInvitePreview, useAcceptInvite, mutateAsync } = vi.hoisted(() => ({
  useInvitePreview: vi.fn(),
  useAcceptInvite: vi.fn(),
  mutateAsync: vi.fn(),
}))

vi.mock('#/features/households/hooks/use-household-invites', () => ({
  useInvitePreview,
  useAcceptInvite,
}))

const { JoinHousehold } =
  await import('#/features/households/components/JoinHousehold.tsx')

const onJoined = vi.fn()
const onDismiss = vi.fn()

function show({
  preview = {
    data: { householdName: 'Flat', invitedBy: 'Alex' as string | null },
    isLoading: false,
    isError: false,
  },
  accept = {},
}: {
  preview?: object
  accept?: object
} = {}) {
  useInvitePreview.mockReturnValue(preview)
  useAcceptInvite.mockReturnValue({
    mutateAsync,
    isPending: false,
    isError: false,
    error: null,
    ...accept,
  })
  return render(
    <JoinHousehold token="secret" onJoined={onJoined} onDismiss={onDismiss} />,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JoinHousehold', () => {
  it('says which group the link is for and who sent it', () => {
    show()

    expect(screen.getByText('Join Flat?')).toBeTruthy()
    expect(screen.getByText(/Alex invited you to this group/)).toBeTruthy()
    expect(useInvitePreview).toHaveBeenCalledWith('secret')
  })

  it('copes with an inviter who has no name', () => {
    show({
      preview: {
        data: { householdName: 'Flat', invitedBy: null },
        isLoading: false,
        isError: false,
      },
    })

    expect(screen.getByText(/You have been invited to this group/)).toBeTruthy()
  })

  it('joins only when asked, then reports back', async () => {
    mutateAsync.mockResolvedValue('house-1')
    show()

    expect(mutateAsync).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Join group' }))

    await waitFor(() => expect(onJoined).toHaveBeenCalledOnce())
    expect(mutateAsync).toHaveBeenCalledWith('secret')
  })

  it('stays put when joining fails', async () => {
    mutateAsync.mockRejectedValue(new Error('already a member'))
    show()

    fireEvent.click(screen.getByRole('button', { name: 'Join group' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce())
    expect(onJoined).not.toHaveBeenCalled()
  })

  it('shows why joining failed', () => {
    show({
      accept: {
        isError: true,
        error: new Error('You are already a member of this household'),
      },
    })

    expect(
      screen.getByText('You are already a member of this household'),
    ).toBeTruthy()
  })

  it('lets the user back out without joining', () => {
    show()

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(onDismiss).toHaveBeenCalledOnce()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('explains a dead link instead of offering to join', () => {
    show({ preview: { data: undefined, isLoading: false, isError: true } })

    expect(screen.getByText("This invite can't be used")).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Join group' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Go to dashboard' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('offers nothing while the invite is being looked up', () => {
    show({ preview: { data: undefined, isLoading: true, isError: false } })

    expect(screen.queryByRole('button')).toBeNull()
  })
})
