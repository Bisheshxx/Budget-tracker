import { SupabaseRecurringExpenseRepository } from './supabase-recurring-expense-repository'
import type { IRecurringExpenseRepository } from './IRecurringExpenseRepository'

// THE swap point for recurring-expense data. Replace this one construction to
// move to an axios/REST backend later; nothing else references the concrete
// implementation.
export const recurringExpenseRepository: IRecurringExpenseRepository =
  new SupabaseRecurringExpenseRepository()
