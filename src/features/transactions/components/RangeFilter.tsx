import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { rangeSchema } from '#/features/transactions/schema'
import type { RangeFormValues } from '#/features/transactions/schema'
import type { Range } from '#/features/transactions/range'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'

// The Range filter inside the "This Period" card (see PRD B): two date inputs
// plus Apply/Clear. Applying re-scopes both the card and the transaction list to
// an arbitrary span by writing `?from=&to=` to the dashboard search params;
// clearing removes them (back to the current Period). The active Range lives in
// the URL — not local state — so it survives refresh and is shareable. `range`
// seeds the inputs from whatever the URL currently carries.
export function RangeFilter({ range }: { range: Range | null }) {
  const navigate = useNavigate()

  const form = useForm<RangeFormValues>({
    resolver: zodResolver(rangeSchema),
    defaultValues: { from: range?.from ?? '', to: range?.to ?? '' },
  })
  const { control, handleSubmit, formState, reset } = form

  // The component stays mounted while the URL changes (back/forward, Clear,
  // shared links), so re-seed the inputs whenever the active Range moves.
  useEffect(() => {
    reset({ from: range?.from ?? '', to: range?.to ?? '' })
  }, [range, reset])

  function onApply(values: RangeFormValues) {
    navigate({ to: '/dashboard', search: values })
  }

  function onClear() {
    reset({ from: '', to: '' })
    navigate({ to: '/dashboard', search: {} })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onApply)}
        noValidate
        className="flex items-end gap-2"
      >
        <FormField
          control={control}
          name="from"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>From</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="to"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>To</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="sm" disabled={formState.isSubmitting}>
          Apply
        </Button>
        {range && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
      </form>
    </Form>
  )
}
