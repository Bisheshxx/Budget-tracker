import { createFileRoute } from '@tanstack/react-router'
import { useProfile } from '#/shared/hooks/use-profile'
import { SettingsForm } from '#/features/profile/components/SettingsForm'
import { CategoryManager } from '#/features/categories/components/CategoryManager'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { SettingsFormSkeleton } from '#/shared/components/skeleton-loaders/SettingsSkeleton'

// Protected (nested under _authed, so session + onboarding are already
// guaranteed). Edits the profile fields captured at Onboarding, plus category
// management — moved here from the Dashboard since categories are account-wide
// configuration, not day-to-day cashflow.
export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { profile, loading } = useProfile()

  return (
    <main className="mx-auto w-full max-w-[98.5rem] px-4 py-6 lg:py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {/* Same page width + grid spirit as Dashboard/Reports (max-w-[98.5rem],
          same 5/7 column split as Dashboard's Cashflow/Recent-transactions
          layout) so every _authed page shares one consistent container. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Update your display name, currency, and Period start day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* _authed already gates on a resolved profile, but render defensively
                while the cache rehydrates so the form always has seed values. */}
            {loading || !profile ? (
              <SettingsFormSkeleton />
            ) : (
              <SettingsForm profile={profile} />
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-7">
          <CategoryManager />
        </div>
      </div>
    </main>
  )
}
