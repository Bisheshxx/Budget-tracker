import { recurringExpenseRepository } from '#/data/recurring'
import { RecurringService } from './recurring-service'

// Composition root for the recurring feature: the app-wide RecurringService
// singleton, wired to the active repository. Swap the repository in
// #/data/recurring to move off Supabase.
export const recurringService = new RecurringService(recurringExpenseRepository)
