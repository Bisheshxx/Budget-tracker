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
      className="mx-auto w-full max-w-[98.5rem] px-4 py-6 lg:py-8"
    >
      <span className="sr-only">Loading settings</span>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Update your display name, currency, and Period start day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsFormSkeleton />
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoriesSkeleton />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function CategoriesSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-live="polite"
      className="flex max-h-80 flex-col divide-y overflow-hidden pr-1"
    >
      <span className="sr-only">Loading categories</span>
      {Array.from({ length: 6 }, (_, index) => (
        <li
          key={index}
          className="flex items-center justify-between gap-2 py-2"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Skeleton className="size-3 shrink-0 rounded-full" />
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className="h-4 w-28 max-w-full" />
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </span>
        </li>
      ))}
    </ul>
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
