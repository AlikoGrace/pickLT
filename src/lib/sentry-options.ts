// Options shared by the browser, server and edge Sentry inits (plan
// pickltmobile/.agent/plans/sentry.md). Inert without NEXT_PUBLIC_SENTRY_DSN.
// Errors always; performance traces on 10%; no replay; personal data scrubbed.
import { scrubBreadcrumb, scrubEvent } from './sentry-scrub'

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || ''

export function sentryOptions() {
  return {
    dsn: SENTRY_DSN,
    enabled: Boolean(SENTRY_DSN),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  }
}
