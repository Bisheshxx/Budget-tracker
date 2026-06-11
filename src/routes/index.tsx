import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../lib/auth-context'

export const Route = createFileRoute('/')({ component: Landing })

function Landing() {
  const { session, loading } = useAuth()
  const primaryTo = session ? '/dashboard' : '/signup'
  const primaryLabel = session ? 'Go to dashboard' : 'Get started'

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Personal finance, simplified</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Know where your money goes.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Track income and spending each period, see your cashflow at a glance,
          and stay in control — no spreadsheets required.
        </p>
        {!loading && (
          <div className="flex flex-wrap gap-3">
            <Link
              to={primaryTo}
              className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
            >
              {primaryLabel}
            </Link>
            {!session && (
              <Link
                to="/login"
                className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
              >
                Log in
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
