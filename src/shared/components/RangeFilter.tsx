import { useEffect, useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { rangeSchema } from '#/shared/schemas/transaction.schema'
import { formatRangeLabel } from '#/shared/utils/range.util'
import type { Range } from '#/shared/utils/range.util'
import { formatYmd, parseYmd } from '#/shared/lib/period'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import type { DateRange } from 'react-day-picker'

// A popover range calendar plus Apply/Clear, generic over where the applied
// Range goes — the caller owns persistence (e.g. navigating to `?from=&to=`)
// via `onApply`/`onClear`. Used by the Dashboard's Cashflow card and the
// Reports page's Custom range option (promoted here per ADR 0003 once Reports
// became a second consumer). `range` seeds the calendar from whatever the
// caller currently considers active, and also drives the trigger's active
// (`default` vs `outline`) styling — so a caller whose "custom" view is only
// ever reachable via an applied Range gets the "active button" look for free.

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

export function RangeFilter({
  range,
  placeholder = 'Filter by date range',
  onApply,
  onClear,
}: {
  range: Range | null
  placeholder?: string
  onApply: (range: Range) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<DateRange | undefined>(() =>
    rangeToSelection(range),
  )

  // The component stays mounted while the active Range changes (back/forward,
  // Clear, shared links), so re-seed the selection whenever it moves.
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

  function handleApply() {
    if (!draft) return
    setOpen(false)
    onApply(draft)
  }

  function handleClear() {
    setSelected(undefined)
    setOpen(false)
    onClear()
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
          variant={range ? 'default' : 'outline'}
          className="justify-start font-normal"
          aria-label="Filter by date range"
        >
          <CalendarIcon />
          {range ? (
            formatRangeLabel(range)
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!canApply}
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
