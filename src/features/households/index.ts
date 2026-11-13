import { householdRepository } from '#/data/households'
import { HouseholdService } from '#/features/households/services/household-service'

// Composition root for the households feature: the app-wide HouseholdService
// singleton, wired to the active repository.
// The backend behind it is chosen in src/data/index.ts (docs/adr/0011) —
// nothing here changes on a swap.
export const householdService = new HouseholdService(householdRepository)
