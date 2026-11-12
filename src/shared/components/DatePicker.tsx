import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import type { ComponentProps } from 'react'
import type { Matcher } from 'react-day-picker'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'

// The app's single-date picker: shadcn Popover + Calendar behind a Button
// trigger — the same primitives RangeFilter uses for ranges, so every date
// control looks and behaves alike. Controlled by the caller (`value`/`onChange`)
// and closes on pick. Extra props land on the trigger button, so it can sit
// inside a shadcn `FormControl` (which injects id/aria attributes).
interface DatePickerProps extends Omit<
  ComponentProps<typeof Button>,
  'value' | 'onChange'
> {
  value: Date | undefined
  onChange: (date: Date) => void
  placeholder?: string
  /** Days the user cannot pick (react-day-picker matcher). */
  disabledDays?: Matcher | Matcher[]
}

const LABEL_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabledDays,
  className,
  ...triggerProps
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('justify-start font-normal', className)}
          {...triggerProps}
        >
          <CalendarIcon />
          {value ? (
            value.toLocaleDateString(undefined, LABEL_FORMAT)
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          disabled={disabledDays}
          onSelect={(date) => {
            if (!date) return
            onChange(date)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
