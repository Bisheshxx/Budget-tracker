import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { householdService } from '#/features/households'
import { queryKeys } from '#/shared/lib/query-keys'

// The active members of a Household. Reads the same cached "people" list the
// author names use (#/shared/hooks/use-entry-authors) and narrows it here.
export function useHouseholdMembers(householdId: string) {
  return useQuery({
    queryKey: queryKeys.households.people(householdId),
    queryFn: () => householdService.listPeople(householdId),
    select: (people) => householdService.activeMembers(people),
  })
}

// Membership changes. Removing someone only changes the member list; handing
// over the Admin role or leaving also changes what the user's own Household
// list says (their role, or whether the group is there at all), so those
// refresh it too — after leaving, the active Household falls back to Personal.
export function useMembershipMutations(householdId: string) {
  const queryClient = useQueryClient()
  const refreshPeople = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.households.people(householdId),
    })
  const refreshHouseholds = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.households.all() })

  const remove = useMutation({
    mutationFn: (profileId: string) =>
      householdService.removeMember(householdId, profileId),
    onSuccess: refreshPeople,
  })

  const transferAdmin = useMutation({
    mutationFn: (profileId: string) =>
      householdService.transferAdmin(householdId, profileId),
    onSuccess: () => Promise.all([refreshPeople(), refreshHouseholds()]),
  })

  const leave = useMutation({
    mutationFn: (deleteIfLast: boolean) =>
      householdService.leave(householdId, deleteIfLast),
    onSuccess: refreshHouseholds,
  })

  return { remove, transferAdmin, leave }
}
