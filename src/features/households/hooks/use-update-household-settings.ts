import { useMutation, useQueryClient } from '@tanstack/react-query'
import { householdService } from '#/features/households'
import { queryKeys } from '#/shared/lib/query-keys'
import type { HouseholdSettingsInput } from '#/features/households/schemas/household.schema'

// Save a group's settings. The Household list carries them (currency, Period
// start day and time zone drive every ledger screen through useLedger), so
// refreshing it re-points the whole app.
export function useUpdateHouseholdSettings(householdId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: HouseholdSettingsInput) =>
      householdService.updateSettings(householdId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.households.all() }),
  })
}
