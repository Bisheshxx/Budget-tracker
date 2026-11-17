// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { defaultPermissions, household } from '../../../helpers/household.ts'

const { mutateAsync, useUpdateHouseholdSettings } = vi.hoisted(() => {
  const mutate = vi.fn()
  return {
    mutateAsync: mutate,
    useUpdateHouseholdSettings: vi.fn(() => ({ mutateAsync: mutate })),
  }
})

vi.mock('#/features/households/hooks/use-update-household-settings', () => ({
  useUpdateHouseholdSettings,
}))

const { HouseholdSettingsForm } =
  await import('#/features/households/components/HouseholdSettingsForm.tsx')

const flat = household({ id: 'flat', role: 'admin', periodStartDay: 25 })

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
})

const saveButton = () =>
  screen.getByRole<HTMLButtonElement>('button', { name: 'Save group settings' })

function rename(name: string) {
  fireEvent.change(screen.getByLabelText('Group name'), {
    target: { value: name },
  })
}

describe('HouseholdSettingsForm', () => {
  it("starts from the group's saved settings with nothing to save", () => {
    render(<HouseholdSettingsForm household={flat} />)

    expect(screen.getByLabelText<HTMLInputElement>('Group name').value).toBe(
      'Flat',
    )
    expect(
      screen
        .getByRole('switch', { name: "Edit other people's entries" })
        .getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      screen
        .getByRole('switch', { name: 'Invite people' })
        .getAttribute('aria-checked'),
    ).toBe('false')
    expect(saveButton().disabled).toBe(true)
    expect(useUpdateHouseholdSettings).toHaveBeenCalledWith('flat')
  })

  it('saves a new name and a flipped permission together', async () => {
    mutateAsync.mockResolvedValue(undefined)
    render(<HouseholdSettingsForm household={flat} />)

    rename('Flat 2B')
    fireEvent.click(screen.getByRole('switch', { name: 'Invite people' }))
    fireEvent.click(saveButton())

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce())
    expect(mutateAsync).toHaveBeenCalledWith({
      name: 'Flat 2B',
      currency: 'AUD',
      periodStartDay: 25,
      timeZone: 'Pacific/Auckland',
      permissions: { ...defaultPermissions, contributorsCanInvite: true },
    })
    expect(await screen.findByText('Changes saved.')).toBeTruthy()
    expect(saveButton().disabled).toBe(true)
  })

  it('asks for a name instead of saving a blank one', async () => {
    render(<HouseholdSettingsForm household={flat} />)

    rename('  ')
    fireEvent.click(saveButton())

    expect(await screen.findByText('Give the group a name')).toBeTruthy()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('shows why a save was refused and keeps the edits', async () => {
    mutateAsync.mockRejectedValue(
      new Error('Only the admin can change group settings'),
    )
    render(<HouseholdSettingsForm household={flat} />)

    rename('Flat 2B')
    fireEvent.click(saveButton())

    expect(
      await screen.findByText('Only the admin can change group settings'),
    ).toBeTruthy()
    expect(screen.getByLabelText<HTMLInputElement>('Group name').value).toBe(
      'Flat 2B',
    )
    expect(screen.queryByText('Changes saved.')).toBeNull()
  })
})
