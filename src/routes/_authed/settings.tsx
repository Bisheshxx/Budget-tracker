import { createFileRoute } from '@tanstack/react-router'
import { useProfile } from '#/shared/hooks/use-profile'
import { SettingsForm } from '#/features/profile/components/SettingsForm'
import { HouseholdPanel } from '#/features/households/components/HouseholdPanel'
import { CategoryManager } from '#/features/categories/components/CategoryManager'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { HouseholdSwitcher } from '#/shared/components/HouseholdSwitcher'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { SettingsFormSkeleton } from '#/shared/components/skeleton-loaders/SettingsSkeleton'

// Protected (nested under _authed, so session + onboarding are already
// guaranteed). Edits the profile fields captured at Onboarding, the active
// Household's categories (moved here from the Dashboard since they are
// configuration, not day-to-day cashflow) on the General tab, and the active
// group's own settings, members and invites on the Groups tab.
export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { profile, loading } = useProfile()

  return (
    <main className="mx-auto w-full max-w-[98.5rem] px-4 py-6 lg:py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Tabs defaultValue="general" className="mt-6 gap-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        {/* Same page width + grid spirit as Dashboard/Reports (max-w-[98.5rem],
            same 5/7 column split as Dashboard's Cashflow/Recent-transactions
            layout) so every _authed page shares one consistent container. */}
        <TabsContent
          value="general"
          className="grid grid-cols-1 gap-6 lg:grid-cols-12"
        >
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your display name, and the currency and Period start day
                of your personal ledger.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* _authed already gates on a resolved profile, but render
                  defensively while the cache rehydrates so the form always has
                  seed values. */}
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
        </TabsContent>

        {/* The switcher is the header's own control: picking a group here
            changes the active Household for the whole app, and the panel below
            follows it. */}
        <TabsContent value="groups" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Showing settings for
            </span>
            <HouseholdSwitcher align="start" />
          </div>
          <HouseholdPanel />
        </TabsContent>
      </Tabs>
    </main>
  )
}
