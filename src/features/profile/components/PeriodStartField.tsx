import { CalendarCheck } from 'lucide-react'
import {
  addDays,
  dateToYmd,
  resolvePeriod,
  todayYmd,
  ymdToDate,
} from '#/shared/lib/period'
import {
  MAX_START_DAY,
  MIN_START_DAY,
} from '#/shared/constants/period.constant'
import { ordinal } from '#/shared/utils/ordinal.util'
import { DatePicker } from '#/shared/components/DatePicker'
import { Button } from '#/components/ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'
import type { Control } from 'react-hook-form'
import type {
  OnboardingFormValues,
  OnboardingInput,
} from '#/features/profile/schema'

const SHORT_DATE: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}

function formatYmdShort(ymd: string): string {
  return ymdToDate(ymd).toLocaleDateString(undefined, SHORT_DATE)
}

// The Period anchor day (1–28) as the user actually thinks of it: "from when".
// Two ways to set it — a "Now" button (anchor on today) or a date picker (anchor
// on whichever date they pick). Either way only the day-of-month is stored, as
// `budgetPeriodStartDay`, so every Period boundary keeps resolving through the
// existing pure helpers in #/shared/lib/period. The picker shows the start date
// of the *current* Period for the stored day, and a summary line spells out what
// that means. Days 29–31 can't anchor a monthly Period (they don't exist in
// every month), so the picker disables them and "Now" clamps to the 28th.
export function PeriodStartField({
  control,
  hint,
}: {
  control: Control<OnboardingFormValues, unknown, OnboardingInput>
  /** Extra sentence appended to the summary (e.g. a note for Settings). */
  hint?: string
}) {
  return (
    <FormField
      control={control}
      name="budgetPeriodStartDay"
      render={({ field }) => {
        const day = Number(field.value)
        const valid =
          Number.isInteger(day) && day >= MIN_START_DAY && day <= MAX_START_DAY
        const today = todayYmd()
        const period = valid ? resolvePeriod(today, day) : null

        return (
          <FormItem>
            <div className="flex items-baseline justify-between gap-2">
              <FormLabel>Period start</FormLabel>
              <FormMessage className="mt-0" />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Anchor on today, clamped to the 28th (see header comment).
                  const now = Math.min(
                    MAX_START_DAY,
                    ymdToDate(today).getDate(),
                  )
                  field.onChange(String(now))
                }}
              >
                <CalendarCheck />
                Now
              </Button>
              <FormControl>
                <DatePicker
                  className="min-w-0 flex-1"
                  aria-label="Pick the Period start date"
                  placeholder="Pick a date"
                  value={period ? ymdToDate(period.start) : undefined}
                  disabledDays={(date) => date.getDate() > MAX_START_DAY}
                  onChange={(date) => {
                    // Only the day-of-month matters; dateToYmd keeps it local.
                    field.onChange(String(ymdToDate(dateToYmd(date)).getDate()))
                  }}
                />
              </FormControl>
            </div>
            <FormDescription>
              {period
                ? `Each Period starts on the ${ordinal(day)}. Current Period: ${formatYmdShort(period.start)} – ${formatYmdShort(addDays(period.end, -1))}.`
                : 'Pick the date your monthly Period begins.'}
              {hint ? ` ${hint}` : ''} Dates after the 28th aren&apos;t
              available.
            </FormDescription>
          </FormItem>
        )
      }}
    />
  )
}
