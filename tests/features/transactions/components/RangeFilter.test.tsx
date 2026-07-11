// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// Mock the router so Apply/Clear record navigations instead of needing a real
// router instance. vi.hoisted keeps the spy reachable in the factory.
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const { RangeFilter } =
  await import('#/features/transactions/components/RangeFilter.tsx')
const { formatRangeLabel } = await import('#/features/transactions/range.ts')

// Radix's popover positioning (floating-ui) needs ResizeObserver, which jsdom
// doesn't provide.
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const range = { from: '2026-01-03', to: '2026-03-18' }

function openPopover() {
  fireEvent.click(screen.getByRole('button', { name: /filter by date range/i }))
}

describe('RangeFilter', () => {
  it('shows the placeholder when no Range is active and disables Apply', () => {
    render(<RangeFilter range={null} />)

    expect(screen.getByText('Filter by date range')).toBeDefined()

    openPopover()

    // No selection yet → Apply disabled, and Clear hidden (nothing to clear).
    const apply = screen.getByRole('button', { name: 'Apply' })
    expect(apply.hasAttribute('disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  it('shows the active Range label on the trigger', () => {
    render(<RangeFilter range={range} />)

    expect(screen.getByText(formatRangeLabel(range))).toBeDefined()
  })

  it('applies the seeded Range back to the URL', () => {
    render(<RangeFilter range={range} />)

    openPopover()

    // Seeded from the active Range, the selection is already complete.
    const apply = screen.getByRole('button', { name: 'Apply' })
    expect(apply.hasAttribute('disabled')).toBe(false)

    fireEvent.click(apply)
    expect(navigate).toHaveBeenCalledWith({
      to: '/dashboard',
      search: range,
    })
  })

  it('clears the Range from the URL', () => {
    render(<RangeFilter range={range} />)

    openPopover()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(navigate).toHaveBeenCalledWith({ to: '/dashboard', search: {} })
  })

  it('navigates with a range picked on the calendar', () => {
    render(<RangeFilter range={null} />)

    openPopover()

    // Pick the 3rd and the 5th of the calendar's current (first) month. Day
    // buttons carry the full date in data-day. Re-query between clicks: the
    // calendar re-renders on selection, so earlier button handles go stale.
    function dayButton(label: string) {
      const day = screen
        .getAllByRole('button')
        .filter((b) => b.getAttribute('data-day'))
        .find((b) => b.textContent === label)
      if (!day) throw new Error(`expected a day button labelled ${label}`)
      return day
    }

    fireEvent.click(dayButton('3'))
    fireEvent.click(dayButton('5'))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(navigate).toHaveBeenCalledTimes(1)
    const search = navigate.mock.calls[0][0].search
    expect(search.from <= search.to).toBe(true)
    expect(search.from.endsWith('-03')).toBe(true)
    expect(search.to.endsWith('-05')).toBe(true)
  })
})
