import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuth } from '#/features/auth/auth-context'
import { Money } from '#/shared/components/Money'
import { MoneyBadge } from '#/shared/components/MoneyBadge'

export const Route = createFileRoute('/')({ component: Landing })

// Paper + teal landing. Colors come from the theme tokens in styles.css, so this
// follows light/dark automatically.
function Landing() {
  const { session, loading } = useAuth()
  const primaryTo = session ? '/dashboard' : '/signup'
  const primaryLabel = session ? 'Go to dashboard' : 'Get started'

  return (
    <main className="min-h-[calc(100vh-4rem)] text-foreground">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        {/* Left — message + CTAs */}
        <section>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Personal finance, simplified
          </p>
          <h1 className="display-title mb-5 text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl">
            Know where your
            <br />
            money goes.
          </h1>
          <p className="mb-9 max-w-md text-lg leading-relaxed text-muted-foreground">
            Track income and spending each period, see your cashflow at a glance,
            and stay in control — no spreadsheets required.
          </p>

          {!loading && (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={primaryTo}
                className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground no-underline transition hover:brightness-110"
              >
                {primaryLabel}
              </Link>
              {!session && (
                <Link
                  to="/login"
                  className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground no-underline transition hover:bg-accent"
                >
                  Log in
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Right — product preview card. Illustrative cashflow for one Period. */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">
              This Period
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
              Jun 25 – Jul 24
            </span>
          </div>

          <div className="mb-6">
            <p className="text-sm text-muted-foreground">Net this Period</p>
            <Money
              cents={137000}
              currency="USD"
              signed
              className="display-title block text-4xl font-bold tracking-tight"
            />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <MoneyBadge cents={420000} currency="USD" tone="income" label="Income" />
            <MoneyBadge cents={-283000} currency="USD" tone="expense" label="Spent" />
          </div>

          <p className="mb-3 text-sm font-semibold text-muted-foreground">
            Where it went
          </p>
          <div className="space-y-4">
            {(() => {
              // Top spending categories this Period — bars are each category's
              // share of the largest, so you see proportion at a glance. This is
              // awareness, not a budget cap (see CONTEXT.md).
              const rows = [
                { label: 'Rent', cents: 120000 },
                { label: 'Groceries', cents: 42000 },
                { label: 'Transport', cents: 18000 },
              ]
              const max = Math.max(...rows.map((r) => r.cents))
              return rows.map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-foreground">{row.label}</span>
                    <Money
                      cents={row.cents}
                      currency="USD"
                      className="font-medium text-muted-foreground"
                    />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(row.cents / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            })()}
          </div>
        </section>
      </div>
    </main>
  )
}
