// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useUiStore } from '#/shared/stores/ui-store.ts'
import { household } from '../../helpers/household.ts'

const { useHouseholds } = vi.hoisted(() => ({ useHouseholds: vi.fn() }))
vi.mock('#/shared/hooks/use-households', () => ({ useHouseholds }))

const { HouseholdSwitcher } =
  await import('#/shared/components/HouseholdSwitcher.tsx')

const personal = household({
  id: 'personal',
  name: 'Personal',
  isPersonal: true,
  role: 'admin',
})
const flat = household({ id: 'flat', name: 'Flat' })

const setActive = vi.fn()

// Radix menus need a few layout APIs jsdom lacks.
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

function openMenu() {
  fireEvent.keyDown(screen.getByRole('button', { name: /switch group/i }), {
    key: 'Enter',
  })
}

describe('HouseholdSwitcher', () => {
  it('renders nothing until the Households have loaded', () => {
    useHouseholds.mockReturnValue({ households: [], active: null, setActive })

    const { container } = render(<HouseholdSwitcher />)

    expect(container.innerHTML).toBe('')
  })

  it('shows the active Household on the trigger', () => {
    useHouseholds.mockReturnValue({
      households: [personal, flat],
      active: flat,
      setActive,
    })

    render(<HouseholdSwitcher />)

    expect(
      screen.getByRole('button', { name: 'Switch group, current: Flat' }),
    ).toBeTruthy()
  })

  it('lists every Household with the active one checked', () => {
    useHouseholds.mockReturnValue({
      households: [personal, flat],
      active: personal,
      setActive,
    })
    render(<HouseholdSwitcher />)

    openMenu()

    const items = screen.getAllByRole('menuitemradio')
    expect(items.map((i) => i.textContent)).toEqual(['Personal', 'Flat'])
    expect(items[0].getAttribute('aria-checked')).toBe('true')
    expect(items[1].getAttribute('aria-checked')).toBe('false')
  })

  it('switches to the chosen Household', () => {
    useHouseholds.mockReturnValue({
      households: [personal, flat],
      active: personal,
      setActive,
    })
    render(<HouseholdSwitcher />)
    openMenu()

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Flat' }))

    expect(setActive).toHaveBeenCalledWith('flat')
  })

  it('opens the New group dialog', () => {
    useHouseholds.mockReturnValue({
      households: [personal],
      active: personal,
      setActive,
    })
    render(<HouseholdSwitcher />)
    openMenu()

    fireEvent.click(screen.getByRole('menuitem', { name: 'New group' }))

    expect(useUiStore.getState().activeDialog).toBe('createHousehold')
  })
})
