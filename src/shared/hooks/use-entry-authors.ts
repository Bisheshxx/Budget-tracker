import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { householdService } from '#/features/households'
import { queryKeys } from '#/shared/lib/query-keys'
import { useHouseholds } from '#/shared/hooks/use-households'
import { useProfile } from '#/shared/hooks/use-profile'
import type { HouseholdMember } from '#/features/households/types/household.type'

interface EntryAuthorship {
  createdBy: string | null
  recurringOwnerId?: string | null
}

const NO_PEOPLE: readonly HouseholdMember[] = []

// Who added an entry, for ledger lists. Only a group shows authors — in a
// Personal household every entry is the user's own, so `authorOf` answers null
// and nothing is fetched. Former members keep their name on what they added.
export function useEntryAuthors(): {
  authorOf: (entry: EntryAuthorship) => string | null
} {
  const { active } = useHouseholds()
  const { profile } = useProfile()
  const householdId = active && !active.isPersonal ? active.id : null
  const profileId = profile?.id ?? null

  const { data } = useQuery({
    queryKey: queryKeys.households.people(householdId ?? ''),
    queryFn: () => householdService.listPeople(householdId ?? ''),
    enabled: !!householdId,
  })
  const people = data ?? NO_PEOPLE

  const authorOf = useCallback(
    (entry: EntryAuthorship) =>
      householdId && profileId
        ? householdService.authorLabel(people, entry, profileId)
        : null,
    [householdId, profileId, people],
  )

  return { authorOf }
}
