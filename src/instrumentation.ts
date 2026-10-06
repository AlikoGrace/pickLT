// Starts Sentry on the server and edge runtimes and reports errors thrown
// while rendering or handling requests (plan sentry.md).
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('../sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('../sentry.edge.config')
}

export const onRequestError = Sentry.captureRequestError
