// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RangeFilter } from '#/shared/components/RangeFilter.tsx'
import { formatRangeLabel } from '#/shared/utils/range.util.ts'

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
    render(<RangeFilter range={null} onApply={vi.fn()} onClear={vi.fn()} />)

    expect(screen.getByText('Filter by date range')).toBeDefined()

    openPopover()

    // No selection yet → Apply disabled, and Clear hidden (nothing to clear).
    const apply = screen.getByRole('button', { name: 'Apply' })
    expect(apply.hasAttribute('disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  it('shows a custom placeholder when given one', () => {
    render(
      <RangeFilter
        range={null}
        placeholder="Custom range"
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    )

    expect(screen.getByText('Custom range')).toBeDefined()
  })

  it('shows the active Range label on the trigger', () => {
    render(<RangeFilter range={range} onApply={vi.fn()} onClear={vi.fn()} />)

    expect(screen.getByText(formatRangeLabel(range))).toBeDefined()
  })

  it('applies the seeded Range', () => {
    const onApply = vi.fn()
    render(<RangeFilter range={range} onApply={onApply} onClear={vi.fn()} />)

    openPopover()

    // Seeded from the active Range, the selection is already complete.
    const apply = screen.getByRole('button', { name: 'Apply' })
    expect(apply.hasAttribute('disabled')).toBe(false)

    fireEvent.click(apply)
    expect(onApply).toHaveBeenCalledWith(range)
  })

  it('clears the Range', () => {
    const onClear = vi.fn()
    render(<RangeFilter range={range} onApply={vi.fn()} onClear={onClear} />)

    openPopover()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onClear).toHaveBeenCalled()
  })

  it('applies a range picked on the calendar', () => {
    const onApply = vi.fn()
    render(<RangeFilter range={null} onApply={onApply} onClear={vi.fn()} />)

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

    expect(onApply).toHaveBeenCalledTimes(1)
    const applied = onApply.mock.calls[0][0]
    expect(applied.from <= applied.to).toBe(true)
    expect(applied.from.endsWith('-03')).toBe(true)
    expect(applied.to.endsWith('-05')).toBe(true)
  })
})
