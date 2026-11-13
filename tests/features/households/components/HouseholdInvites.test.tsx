// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

const { useHouseholdInvites, create, revoke, toast } = vi.hoisted(() => ({
  useHouseholdInvites: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('sonner', () => ({ toast }))
vi.mock('#/features/households/hooks/use-household-invites', () => ({
  useHouseholdInvites,
}))

const { HouseholdInvites } =
  await import('#/features/households/components/HouseholdInvites.tsx')

const pendingInvite = {
  id: 'invite-1',
  createdAt: '2026-11-12T00:00:00.000Z',
  expiresAt: '2026-11-19T00:00:00.000Z',
}

function withInvites(invites: (typeof pendingInvite)[], isError = false) {
  useHouseholdInvites.mockReturnValue({
    pending: { data: invites, isError },
    create: { mutateAsync: create, isPending: false },
    revoke: { mutateAsync: revoke, isPending: false },
  })
}

const expectedLink = `${window.location.origin}/join/secret`
const linkField = () =>
  screen.queryByLabelText<HTMLInputElement>('New invite link')

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('HouseholdInvites', () => {
  it('shows no link until one is created', () => {
    withInvites([])

    render(<HouseholdInvites householdId="flat" />)

    expect(linkField()).toBeNull()
    expect(screen.queryByText('Unused links')).toBeNull()
    expect(useHouseholdInvites).toHaveBeenCalledWith('flat')
  })

  it('creates a link and shows it once, ready to copy', async () => {
    withInvites([])
    create.mockResolvedValue({
      id: 'invite-2',
      token: 'secret',
      expiresAt: '2026-11-20T00:00:00.000Z',
    })
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<HouseholdInvites householdId="flat" />)

    fireEvent.click(screen.getByRole('button', { name: 'Create invite link' }))

    await waitFor(() => expect(linkField()?.value).toBe(expectedLink))

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expectedLink))
    expect(toast.success).toHaveBeenCalledWith('Link copied')
  })

  it('says so when the browser will not copy', async () => {
    withInvites([])
    create.mockResolvedValue({
      id: 'invite-2',
      token: 'secret',
      expiresAt: '2026-11-20T00:00:00.000Z',
    })
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    render(<HouseholdInvites householdId="flat" />)

    fireEvent.click(screen.getByRole('button', { name: 'Create invite link' }))
    await waitFor(() => expect(linkField()).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledOnce())
  })

  it('reports a refused invite', async () => {
    withInvites([])
    create.mockRejectedValue(
      new Error('You are not allowed to invite people to this household'),
    )
    render(<HouseholdInvites householdId="flat" />)

    fireEvent.click(screen.getByRole('button', { name: 'Create invite link' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'You are not allowed to invite people to this household',
      ),
    )
    expect(linkField()).toBeNull()
  })

  it('lists unused links and revokes one', async () => {
    withInvites([pendingInvite])
    revoke.mockResolvedValue(undefined)
    render(<HouseholdInvites householdId="flat" />)

    expect(screen.getByText('Unused links')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => expect(revoke).toHaveBeenCalledWith('invite-1'))
    expect(toast.success).toHaveBeenCalledWith('Invite revoked')
  })

  it('hides a just-created link once that invite is revoked', async () => {
    withInvites([{ ...pendingInvite, id: 'invite-2' }])
    create.mockResolvedValue({
      id: 'invite-2',
      token: 'secret',
      expiresAt: '2026-11-20T00:00:00.000Z',
    })
    revoke.mockResolvedValue(undefined)
    render(<HouseholdInvites householdId="flat" />)

    fireEvent.click(screen.getByRole('button', { name: 'Create invite link' }))
    await waitFor(() => expect(linkField()).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => expect(linkField()).toBeNull())
  })

  it('says when the invites could not be loaded', () => {
    withInvites([], true)

    render(<HouseholdInvites householdId="flat" />)

    expect(screen.getByText('Could not load the invites.')).toBeTruthy()
  })
})
