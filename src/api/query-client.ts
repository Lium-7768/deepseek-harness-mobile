import { QueryClient } from '@tanstack/react-query'
import { MobileApiError } from './mobile-api'
import { RequestCancelledError } from './request'

/** Native queries refresh on foreground; commands are never automatically retried. */
export function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof RequestCancelledError) return false
          if (error instanceof MobileApiError && !['network', 'desktop-unavailable', 'timeout'].includes(error.kind))
            return false
          return failureCount < 2
        },
      },
      mutations: { retry: false },
    },
  })
}
