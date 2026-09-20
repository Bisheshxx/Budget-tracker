// Daily cron target (see supabase/migrations/*_recurring_reconcile_cron.sql):
// auto-posts every currently-Due recurring transaction occurrence, across all
// users, so posting happens on the actual due date even if nobody opens the
// app. Mirrors RecurringService.reconcileDue's logic (src/features/recurring/
// recurring-service.ts) against a service-role Supabase client — see
// docs/adr/0010-recurring-transactions-auto-posting.md for why this is a
// separate, minimal implementation rather than a shared module.
//
// Auth: this function is invoked by pg_cron with no user session, so
// `verify_jwt` is disabled for it (see supabase/config.toml) and it instead
// checks a shared secret header set from an environment variable.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { computeDue } from '../_shared/due.ts'
import type { DueOccurrence, RecurringTransactionLike } from '../_shared/due.ts'

const CRON_SECRET = Deno.env.get('RECONCILE_RECURRING_CRON_SECRET')

interface RecurringTransactionRow extends RecurringTransactionLike {
  user_id: string
  category_id: string
  amount_cents: number
  kind: 'expense' | 'income'
}

interface TemplateQueryRow {
  id: string
  user_id: string
  category_id: string
  name: string
  amount_cents: number
  kind: 'expense' | 'income'
  frequency: 'weekly' | 'fortnightly' | 'monthly'
  first_due_date: string
  monthly_rule_type: 'day-of-month' | 'nth-weekday' | null
  monthly_weekday: number | null
  monthly_nth: number | null
  active: boolean
}

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const today = new Date().toISOString().slice(0, 10)

  try {
    const byUser = await loadActiveTemplatesByUser(supabase)
    let posted = 0
    let skippedAsDuplicate = 0

    for (const [userId, userTemplates] of byUser) {
      const result = await reconcileUserDue(supabase, userId, userTemplates, today)
      posted += result.posted
      skippedAsDuplicate += result.skippedAsDuplicate
    }

    return new Response(JSON.stringify({ posted, skippedAsDuplicate }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})

// Every active template, grouped by owning user — the shape computeDue and
// the per-user reconcile loop both expect.
async function loadActiveTemplatesByUser(
  supabase: SupabaseClient,
): Promise<Map<string, RecurringTransactionRow[]>> {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select(
      'id, user_id, category_id, name, amount_cents, kind, frequency, first_due_date, monthly_rule_type, monthly_weekday, monthly_nth, active',
    )
    .eq('active', true)
  if (error) throw error

  const byUser = new Map<string, RecurringTransactionRow[]>()
  for (const row of (data ?? []) as TemplateQueryRow[]) {
    const list = byUser.get(row.user_id) ?? []
    list.push(toTemplate(row))
    byUser.set(row.user_id, list)
  }
  return byUser
}

function toTemplate(row: TemplateQueryRow): RecurringTransactionRow {
  const monthlyRule =
    row.frequency === 'monthly'
      ? row.monthly_rule_type === 'nth-weekday' &&
        row.monthly_weekday != null &&
        row.monthly_nth != null
        ? {
            type: 'nth-weekday' as const,
            weekday: row.monthly_weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
            nth: row.monthly_nth as 1 | 2 | 3 | 4 | -1,
          }
        : {
            type: 'day-of-month' as const,
            day: Number(row.first_due_date.slice(8, 10)),
          }
      : null

  return {
    id: row.id,
    user_id: row.user_id,
    category_id: row.category_id,
    name: row.name,
    amount_cents: row.amount_cents,
    kind: row.kind,
    frequency: row.frequency,
    firstDueDate: row.first_due_date,
    monthlyRule,
    active: row.active,
  }
}

// One user's Due occurrences, posted (or confirmed already-posted). Mirrors
// RecurringService.reconcileDue's per-item flow.
async function reconcileUserDue(
  supabase: SupabaseClient,
  userId: string,
  userTemplates: RecurringTransactionRow[],
  today: string,
): Promise<{ posted: number; skippedAsDuplicate: number }> {
  const firstDueDate = userTemplates.reduce(
    (min, t) => (t.firstDueDate < min ? t.firstDueDate : min),
    userTemplates[0].firstDueDate,
  )
  const periodEnd = addOneDay(today)

  const { data: occurrenceRows, error: occurrenceError } = await supabase
    .from('recurring_transaction_occurrences')
    .select('recurring_transaction_id, occurrence_date')
    .in(
      'recurring_transaction_id',
      userTemplates.map((t) => t.id),
    )
    .gte('occurrence_date', firstDueDate)
    .lt('occurrence_date', periodEnd)
  if (occurrenceError) throw occurrenceError

  const resolved = (occurrenceRows ?? []).map((r) => ({
    recurringTransactionId: r.recurring_transaction_id as string,
    occurrenceDate: r.occurrence_date as string,
  }))

  const due = computeDue(
    userTemplates,
    { start: firstDueDate, end: periodEnd },
    today,
    resolved,
  )

  let posted = 0
  let skippedAsDuplicate = 0
  for (const item of due) {
    const wasNew = await postDueItem(supabase, userId, item)
    if (wasNew) posted += 1
    else skippedAsDuplicate += 1
  }
  return { posted, skippedAsDuplicate }
}

// Post a single Due occurrence: create its transaction and record the
// occurrence confirmed. Safe to call concurrently (client on load + this same
// cron) — recordConfirmed is an idempotent upsert, and if this call's
// transaction loses the race (someone else's already won the slot), the
// orphan transaction it created is deleted. Returns whether this call is the
// one that newly posted it.
async function postDueItem(
  supabase: SupabaseClient,
  userId: string,
  item: DueOccurrence<RecurringTransactionRow>,
): Promise<boolean> {
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      category_id: item.recurringTransaction.category_id,
      type: item.recurringTransaction.kind,
      amount_cents: item.recurringTransaction.amount_cents,
      note: null,
      transaction_date: item.occurrenceDate,
      recurring_transaction_id: item.recurringTransaction.id,
    })
    .select('id')
    .single()
  if (transactionError) throw transactionError

  const { data: occurrence, error: occurrenceError } = await supabase
    .from('recurring_transaction_occurrences')
    .upsert(
      {
        recurring_transaction_id: item.recurringTransaction.id,
        occurrence_date: item.occurrenceDate,
        status: 'confirmed',
        transaction_id: transaction.id,
      },
      {
        onConflict: 'recurring_transaction_id,occurrence_date',
        ignoreDuplicates: false,
      },
    )
    .select('transaction_id')
    .single()
  if (occurrenceError) throw occurrenceError

  if (occurrence.transaction_id !== transaction.id) {
    // Lost the race (client-triggered reconcile already posted this slot).
    await supabase.from('transactions').delete().eq('id', transaction.id)
    return false
  }
  return true
}

function addOneDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-')
}
