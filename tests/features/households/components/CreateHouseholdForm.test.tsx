// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type * as Period from '#/shared/lib/period.ts'

const { useProfile, mutateAsync } = vi.hoisted(() => ({
  useProfile: vi.fn(),
  mutateAsync: vi.fn(),
}))

vi.mock('#/shared/hooks/use-profile', () => ({ useProfile }))
vi.mock('#/features/households/hooks/use-create-household', () => ({
  useCreateHousehold: () => ({ mutateAsync }),
}))
// Pin the device zone so the default does not depend on the test machine.
vi.mock('#/shared/lib/period', async (importOriginal) => ({
  ...(await importOriginal<typeof Period>()),
  deviceTimeZone: () => 'Pacific/Auckland',
}))

const { CreateHouseholdForm } =
  await import('#/features/households/components/CreateHouseholdForm.tsx')

const onCreated = vi.fn()

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  useProfile.mockReturnValue({
    profile: { id: 'profile-1', currency: 'AUD', budgetPeriodStartDay: 25 },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function submit(name: string) {
  fireEvent.change(screen.getByLabelText('Group name'), {
    target: { value: name },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create group' }))
}

describe('CreateHouseholdForm', () => {
  it("creates the group with the user's settings and device zone as defaults", async () => {
    mutateAsync.mockResolvedValue('house-9')
    render(<CreateHouseholdForm onCreated={onCreated} />)

    submit('Flat')

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce())
    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'Flat',
      currency: 'AUD',
      periodStartDay: 25,
      timeZone: 'Pacific/Auckland',
    })
  })

  it('falls back to USD when the profile currency is not one we offer', async () => {
    useProfile.mockReturnValue({
      profile: { id: 'profile-1', currency: 'XXX', budgetPeriodStartDay: 1 },
    })
    mutateAsync.mockResolvedValue('house-9')
    render(<CreateHouseholdForm onCreated={onCreated} />)

    submit('Flat')

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ currency: 'USD' })
  })

  it('asks for a name instead of submitting a blank one', async () => {
    render(<CreateHouseholdForm onCreated={onCreated} />)

    submit('   ')

    expect(await screen.findByText('Give the group a name')).toBeTruthy()
    expect(mutateAsync).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('shows the failure and stays open when the group cannot be created', async () => {
    mutateAsync.mockRejectedValue(new Error('You need to be signed in'))
    render(<CreateHouseholdForm onCreated={onCreated} />)

    submit('Flat')

    expect(await screen.findByText('You need to be signed in')).toBeTruthy()
    expect(onCreated).not.toHaveBeenCalled()
  })
})
