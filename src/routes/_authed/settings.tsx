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
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your display name, currency, Period start day, and grocery
            day.
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

      <div className="mt-8">
        <CategoryManager />
      </div>
    </main>
  )
}
