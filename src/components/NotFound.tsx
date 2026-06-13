import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

// App-wide fallback for unmatched routes, wired as the router's
// notFoundComponent (see __root.tsx + router.tsx). Colors come from theme tokens.
export function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
