import { useMutation, useQueryClient } from '@tanstack/react-query'
import { householdService } from '#/features/households'
import { queryKeys } from '#/shared/lib/query-keys'
import { useProfile } from '#/shared/hooks/use-profile'
import { writeActiveHouseholdId } from '#/shared/lib/active-household-storage'
import type { CreateHouseholdInput } from '#/features/households/schemas/household.schema'

// Create a group, refresh the user's Household list, then switch to the new
// group — in that order, so the switch lands on a Household the list contains.
export function useCreateHousehold() {
  const { profile } = useProfile()
  const profileId = profile?.id ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateHouseholdInput) => householdService.create(input),
    onSuccess: async (householdId) => {
      if (!profileId) return
      await queryClient.invalidateQueries({
        queryKey: queryKeys.households.list(profileId),
      })
      writeActiveHouseholdId(profileId, householdId)
    },
  })
}
