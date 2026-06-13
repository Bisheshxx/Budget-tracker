import {
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query'
import { notifyError } from '#/lib/errors'

export function getContext() {
  // Cache-level onError is the global net for query/mutation failures: any
  // useQuery/useMutation that doesn't handle its own error surfaces a toast
  // here. notifyError no-ops on the server (this runs during SSR too).
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => notifyError(error),
    }),
    mutationCache: new MutationCache({
      onError: (error) => notifyError(error),
    }),
  })

  return {
    queryClient,
  }
}
export default function TanstackQueryProvider() {}
