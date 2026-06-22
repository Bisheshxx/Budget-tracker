import { createFileRoute } from '@tanstack/react-router'
import { useProfile } from '#/features/profile/use-profile'
import { SettingsForm } from '#/features/profile/components/SettingsForm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

// Protected (nested under _authed, so session + onboarding are already
// guaranteed). Edits the profile fields captured at Onboarding.
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
            Update your display name, currency, Period start day, grocery day,
            and Budget Target.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* _authed already gates on a resolved profile, but render defensively
              while the cache rehydrates so the form always has seed values. */}
          {loading || !profile ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <SettingsForm profile={profile} />
          )}
        </CardContent>
      </Card>
    </main>
  )
}
