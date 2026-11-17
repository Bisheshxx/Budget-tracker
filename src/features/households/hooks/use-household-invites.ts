import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { householdService } from '#/features/households'
import { queryKeys } from '#/shared/lib/query-keys'
import { useProfile } from '#/shared/hooks/use-profile'
import { writeActiveHouseholdId } from '#/shared/lib/active-household-storage'

/** Invite links for a Household that can still be used, and their mutations. */
export function useHouseholdInvites(householdId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.households.invites(householdId)
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })

  const pending = useQuery({
    queryKey: key,
    queryFn: () => householdService.listPendingInvites(householdId),
  })

  const create = useMutation({
    mutationFn: () => householdService.createInvite(householdId),
    onSuccess: refresh,
  })

  const revoke = useMutation({
    mutationFn: (inviteId: string) => householdService.revokeInvite(inviteId),
    onSuccess: refresh,
  })

  return { pending, create, revoke }
}

/** What an invite link leads to, for the join screen. */
export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: queryKeys.households.invitePreview(token),
    queryFn: () => householdService.previewInvite(token),
    // An invalid or expired link stays that way; don't hammer the server.
    retry: false,
  })
}

// Accept an invite, refresh the user's Household list, then switch to the
// group — in that order, so the switch lands on a Household the list contains.
export function useAcceptInvite() {
  const { profile } = useProfile()
  const profileId = profile?.id ?? null
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (token: string) => householdService.acceptInvite(token),
    onSuccess: async (householdId) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.households.all(),
      })
      if (profileId) writeActiveHouseholdId(profileId, householdId)
    },
  })
}
