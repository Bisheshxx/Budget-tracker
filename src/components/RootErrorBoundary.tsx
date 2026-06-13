import { Link } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { getErrorMessage } from '#/lib/errors'

// App-wide fallback for uncaught render/loader errors, wired as the router's
// errorComponent (see __root.tsx + router.tsx). The router passes `reset` to
// retry the failed render and re-run loaders. Colors come from theme tokens.
export function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Something went wrong</CardTitle>
          <CardDescription>{getErrorMessage(error)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link to="/">Go home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
