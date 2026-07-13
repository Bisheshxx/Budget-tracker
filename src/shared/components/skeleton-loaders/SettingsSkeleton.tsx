import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'

export function SettingsSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-lg px-4 py-10"
    >
      <span className="sr-only">Loading settings</span>
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
          <SettingsFormSkeleton />
        </CardContent>
      </Card>
    </main>
  )
}

export function SettingsFormSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-5">
      <span className="sr-only">Loading profile settings</span>
      {[
        ['Display name', "What we'll call you in the app."],
        ['Currency', 'The currency every amount is displayed in.'],
        [
          'Period start day',
          'The day each monthly Period begins (1–28) — changing it shifts the current Period boundaries.',
        ],
        ['Grocery day', null],
      ].map(([label, description]) => (
        <div key={label}>
          <p className="text-sm font-medium">{label}</p>
          <Skeleton className="mt-2 h-10 w-full" />
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
