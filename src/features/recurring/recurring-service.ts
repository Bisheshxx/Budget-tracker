import { recurringSchema } from './schema'
import { computeDue } from './due'
import { toCents } from '#/lib/money'
import {
  addDays,
  addMonths,
  nthWeekdayOfMonth,
  parseYmd,
  todayYmd,
} from '#/shared/lib/period'
import type { RecurringInput } from './schema'
import type {
  DueOccurrence,
  MonthlyNth,
  MonthlyRule,
  RecurringOccurrence,
  RecurringTransaction,
} from '#/features/recurring/types'
import type {
  IRecurringTransactionRepository,
  RecentlyPostedItem,
} from '#/data/recurring/IRecurringTransactionRepository'
import type { ITransactionRepository } from '#/data/transactions/ITransactionRepository'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

// This month's (or, if it's already passed, next month's) date for an
// nth-weekday rule — the anchor a freshly created/edited template starts from.
// The service always derives this rather than trusting a client-supplied date,
// so firstDueDate can never drift from the rule it's supposed to represent.
function deriveNthWeekdayFirstDueDate(
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  nth: MonthlyNth,
  today: string,
): string {
  const { year, month } = parseYmd(today)
  const thisMonth = nthWeekdayOfMonth(year, month, weekday, nth)
  if (thisMonth >= today) return thisMonth
  const [nextYear, nextMonth] = addMonths(year, month, 1)
  return nthWeekdayOfMonth(nextYear, nextMonth, weekday, nth)
}

function resolveMonthlyRule(
  v: RecurringInput,
  today: string,
): { monthlyRule: MonthlyRule | null; firstDueDate: string } {
  if (v.frequency !== 'monthly') {
    return { monthlyRule: null, firstDueDate: v.firstDueDate as string }
  }
  if (v.monthlyRuleType === 'nth-weekday') {
    const weekday = v.monthlyWeekday as 0 | 1 | 2 | 3 | 4 | 5 | 6
    const nth = v.monthlyNth as MonthlyNth
    return {
      monthlyRule: { type: 'nth-weekday', weekday, nth },
      firstDueDate: deriveNthWeekdayFirstDueDate(weekday, nth, today),
    }
  }
  const firstDueDate = v.firstDueDate as string
  return {
    monthlyRule: {
      type: 'day-of-month',
      day: Number(firstDueDate.slice(8, 10)),
    },
    firstDueDate,
  }
}

// Thin service over the recurring-transaction repository. Validates via the
// shared schema (the backstop, not just the UI), converts the display-unit
// amount to integer cents, and persists. Inject fake repositories in tests —
// no Supabase, no RLS. See ADR 0001 / 0010.
export class RecurringService {
  constructor(
    private readonly repo: IRecurringTransactionRepository,
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  // Every template the user owns, active or not — the management screen.
  listAll(userId: string): Promise<RecurringTransaction[]> {
    return this.repo.listAll(userId)
  }

  async create(
    userId: string,
    input: RecurringInput,
    today: string = todayYmd(),
  ): Promise<RecurringTransaction> {
    const v = this.validate(input)
    const { monthlyRule, firstDueDate } = resolveMonthlyRule(v, today)
    return this.repo.create({
      userId,
      categoryId: v.categoryId,
      name: v.name,
      amountCents: toCents(v.amount),
      kind: v.kind,
      frequency: v.frequency,
      monthlyRule,
      firstDueDate,
    })
  }

  // Edit a template. Re-validates through the same schema as create. Per ADR
  // 0010, changing the default amount affects only future occurrences —
  // already-posted occurrences kept their own transaction amount, so nothing to
  // backfill here.
  async update(
    id: string,
    input: RecurringInput,
    today: string = todayYmd(),
  ): Promise<RecurringTransaction> {
    const v = this.validate(input)
    const { monthlyRule, firstDueDate } = resolveMonthlyRule(v, today)
    return this.repo.update(id, {
      categoryId: v.categoryId,
      name: v.name,
      amountCents: toCents(v.amount),
      kind: v.kind,
      frequency: v.frequency,
      monthlyRule,
      firstDueDate,
    })
  }

  // Soft-stop a template: it stops posting but its history is retained for
  // analytics (never deleted). See ADR 0010.
  deactivate(id: string): Promise<RecurringTransaction> {
    return this.repo.deactivate(id)
  }

  // Hard delete, reserved for clearly-wrong templates. The repository always
  // severs any linked transactions first, so confirmed transactions survive
  // regardless of history — see IRecurringTransactionRepository.delete.
  delete(id: string): Promise<void> {
    return this.repo.delete(id)
  }

  // Whether the template has confirmed history — for the management UI's
  // delete confirm-dialog copy only, not a gate on delete's actual behavior.
  hasConfirmedHistory(id: string): Promise<boolean> {
    return this.repo.hasConfirmedHistory(id)
  }

  // The Due items to auto-post in the current Period: the active templates'
  // computed occurrences from their First Due Date through today, minus any
  // already resolved. Nothing is pre-materialized — "Due" is derived (see
  // due.ts / ADR 0010).
  async listDue(
    userId: string,
    today: string,
    _periodStartDay: number,
  ): Promise<DueOccurrence[]> {
    const templates = (await this.repo.listActive(userId)).filter((template) =>
      YMD_RE.test(template.firstDueDate),
    )
    if (templates.length === 0) return []

    const firstDueDate = templates.reduce(
      (min, template) =>
        template.firstDueDate < min ? template.firstDueDate : min,
      templates[0].firstDueDate,
    )
    const period = { start: firstDueDate, end: addDays(today, 1) }
    const resolved = await this.repo.listOccurrencesInRange(
      templates.map((t) => t.id),
      period.start,
      period.end,
    )
    return computeDue(templates, period, today, resolved)
  }

  // Auto-post every currently Due occurrence: create the transaction it stands
  // for (amount/date from the template default, type from kind) linked to the
  // template, then record it confirmed so the slot isn't posted again. Safe to
  // call concurrently (client on load + the daily cron) — recordConfirmed is an
  // idempotent upsert, and if this call's transaction loses the race (someone
  // else's already won the slot), the orphan transaction it created is deleted.
  async reconcileDue(
    userId: string,
    today: string,
    periodStartDay: number,
  ): Promise<RecurringOccurrence[]> {
    const due = await this.listDue(userId, today, periodStartDay)
    const results: RecurringOccurrence[] = []

    for (const item of due) {
      const transaction = await this.transactionRepo.create({
        userId,
        categoryId: item.recurringTransaction.categoryId,
        type: item.recurringTransaction.kind,
        amountCents: item.recurringTransaction.amountCents,
        note: null,
        transactionDate: item.occurrenceDate,
        recurringTransactionId: item.recurringTransaction.id,
      })
      const occurrence = await this.repo.recordConfirmed(
        item.recurringTransaction.id,
        item.occurrenceDate,
        transaction.id,
      )
      if (occurrence.transactionId !== transaction.id) {
        // Lost the race — someone else's transaction already won this slot.
        await this.transactionRepo.delete(transaction.id)
      }
      results.push(occurrence)
    }

    return results
  }

  // Confirmed occurrences (auto-posted transactions) on/after `since`, for the
  // Dashboard's "Recently posted" list.
  listRecentlyPosted(
    userId: string,
    since: string,
  ): Promise<RecentlyPostedItem[]> {
    return this.repo.listRecentlyConfirmed(userId, since)
  }

  // Skip an occurrence that hasn't posted yet (e.g. "don't post rent this
  // month") — records it skipped ahead of time so reconcileDue/computeDue treat
  // it as already resolved and never post it.
  async skipUpcoming(
    recurringTransactionId: string,
    occurrenceDate: string,
  ): Promise<void> {
    await this.repo.recordSkipped(recurringTransactionId, occurrenceDate)
  }

  // Undo an auto-posted transaction: delete it, then flip its occurrence to
  // skipped (never posted again for that date).
  async skip(occurrence: RecurringOccurrence): Promise<void> {
    if (occurrence.transactionId) {
      await this.transactionRepo.delete(occurrence.transactionId)
    }
    await this.repo.recordSkipped(
      occurrence.recurringTransactionId,
      occurrence.occurrenceDate,
    )
  }

  private validate(input: RecurringInput) {
    const result = recurringSchema.safeParse(input)
    if (!result.success) {
      throw new Error(result.error.issues[0].message)
    }
    return result.data
  }
}
