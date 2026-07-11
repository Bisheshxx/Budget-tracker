import { useEffect, useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { rangeSchema } from '#/features/transactions/schema'
import { formatRangeLabel } from '#/features/transactions/range'
import type { Range } from '#/features/transactions/range'
import { formatYmd, parseYmd } from '#/shared/period'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import type { DateRange } from 'react-day-picker'

// The Range filter inside the Actions card (see PRD B): a popover range
// calendar plus Apply/Clear. Applying re-scopes both the Cashflow card and the
// transaction list to an arbitrary span by writing `?from=&to=` to the
// dashboard search params; clearing removes them (back to the current Period).
// The active Range lives in the URL — not local state — so it survives refresh
// and is shareable. `range` seeds the calendar from whatever the URL carries.

function ymdToDate(ymd: string): Date {
  const { year, month, day } = parseYmd(ymd)
  return new Date(year, month - 1, day)
}

function dateToYmd(date: Date): string {
  return formatYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function rangeToSelection(range: Range | null): DateRange | undefined {
  if (!range) return undefined
  return { from: ymdToDate(range.from), to: ymdToDate(range.to) }
}

export function RangeFilter({ range }: { range: Range | null }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<DateRange | undefined>(() =>
    rangeToSelection(range),
  )

  // The component stays mounted while the URL changes (back/forward, Clear,
  // shared links), so re-seed the selection whenever the active Range moves.
  useEffect(() => {
    setSelected(rangeToSelection(range))
  }, [range])

  // A complete selection that also passes the shared range rules (from <= to,
  // no future end) — rangeSchema stays the single source of truth even though
  // the calendar itself already blocks future days.
  const draft =
    selected?.from && selected.to
      ? { from: dateToYmd(selected.from), to: dateToYmd(selected.to) }
      : null
  const canApply = draft !== null && rangeSchema.safeParse(draft).success

  function onApply() {
    if (!draft) return
    setOpen(false)
    navigate({ to: '/dashboard', search: draft })
  }

  function onClear() {
    setSelected(undefined)
    setOpen(false)
    navigate({ to: '/dashboard', search: {} })
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Discard a half-finished selection when the popover closes without
        // applying, so reopening shows the active Range again.
        if (!next) setSelected(rangeToSelection(range))
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start font-normal"
          aria-label="Filter by date range"
        >
          <CalendarIcon />
          {range ? (
            formatRangeLabel(range)
          ) : (
            <span className="text-muted-foreground">Filter by date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          onSelect={setSelected}
          defaultMonth={selected?.from}
          disabled={{ after: new Date() }}
        />
        <div className="flex justify-end gap-2 border-t p-3">
          {range && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!canApply}
            onClick={onApply}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
