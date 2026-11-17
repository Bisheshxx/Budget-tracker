// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Form } from '#/components/ui/form.tsx'
import { PeriodStartField } from '#/shared/components/PeriodStartField.tsx'
import type {
  OnboardingFormValues,
  OnboardingInput,
} from '#/features/profile/schema.ts'

// jsdom has no layout or matchMedia; the Calendar/Popover only need these stubs.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  // Thursday 12 November 2026, local time.
  vi.setSystemTime(new Date(2026, 10, 12, 10, 0, 0))
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// Minimal host form exposing the bound value so tests can assert on it.
function Host({ initial, hint }: { initial: string; hint?: string }) {
  const form = useForm<OnboardingFormValues, unknown, OnboardingInput>({
    defaultValues: { currency: 'USD', budgetPeriodStartDay: initial },
  })
  return (
    <Form {...form}>
      <PeriodStartField
        control={form.control}
        name="budgetPeriodStartDay"
        hint={hint}
      />
      <output data-testid="day">
        {String(form.watch('budgetPeriodStartDay'))}
      </output>
    </Form>
  )
}

const day = () => screen.getByTestId('day').textContent

describe('PeriodStartField', () => {
  it('offers a Now button and a date picker instead of a number input', () => {
    render(<Host initial="1" />)

    expect(screen.getByRole('button', { name: 'Now' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /pick the period start date/i }),
    ).toBeTruthy()
    expect(screen.queryByRole('spinbutton')).toBeNull()
  })

  it("Now anchors the Period on today's day of the month", () => {
    render(<Host initial="1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Now' }))

    expect(day()).toBe('12')
  })

  it('Now clamps to the 28th when today is 29–31', () => {
    vi.setSystemTime(new Date(2026, 9, 31, 10, 0, 0))
    render(<Host initial="1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Now' }))

    expect(day()).toBe('28')
  })

  it('shows the current Period start date for the stored day', () => {
    // Today is 12 Nov; day 25 means the current Period began 25 Oct 2026.
    render(<Host initial="25" />)

    const trigger = screen.getByRole('button', {
      name: /pick the period start date/i,
    })
    expect(trigger.textContent).toMatch(/25/)
    expect(trigger.textContent).toMatch(/2026/)
    expect(
      screen.getByText(/each period starts on the 25th/i).textContent,
    ).toMatch(/Current Period: .*25.*2026 – .*24.*2026/)
  })

  it("picking a date stores that date's day of the month", () => {
    render(<Host initial="1" />)

    fireEvent.click(
      screen.getByRole('button', { name: /pick the period start date/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: /November 5th/i }))

    expect(day()).toBe('5')
  })

  it('does not allow dates after the 28th', () => {
    render(<Host initial="1" />)

    fireEvent.click(
      screen.getByRole('button', { name: /pick the period start date/i }),
    )

    const disabled = (name: RegExp) =>
      screen.getByRole<HTMLButtonElement>('button', { name }).disabled
    expect(disabled(/November 28th/i)).toBe(false)
    expect(disabled(/November 29th/i)).toBe(true)
    expect(disabled(/November 30th/i)).toBe(true)
  })

  it("appends the caller's hint to the summary", () => {
    render(<Host initial="1" hint="Changing it shifts the current Period." />)

    expect(
      screen.getByText(/changing it shifts the current period/i),
    ).toBeTruthy()
  })
})
