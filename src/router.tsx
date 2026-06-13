import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen.ts'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from '#/integrations/tanstack-query/root-provider'
import { NotFound } from '#/components/NotFound'
import { RootErrorBoundary } from '#/components/RootErrorBoundary'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Nested-route render/loader errors render the boundary in place rather than
    // bubbling all the way to the root (which also has these set in __root.tsx).
    defaultErrorComponent: RootErrorBoundary,
    defaultNotFoundComponent: NotFound,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
