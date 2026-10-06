// Options shared by the browser, server and edge Sentry inits (plan
// pickltmobile/.agent/plans/sentry.md). Inert without NEXT_PUBLIC_SENTRY_DSN.
// Errors always; performance traces on 10%; no replay; personal data scrubbed.
import * as Sentry from '@sentry/nextjs'

import { scrubBreadcrumb, scrubEvent } from './sentry-scrub'

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || ''

export function sentryOptions() {
  return {
    dsn: SENTRY_DSN,
    enabled: Boolean(SENTRY_DSN),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    // Classic transactions, so beforeSendTransaction (the scrubber) runs; the
    // v11 default streams spans past it.
    traceLifecycle: 'static' as const,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  }
}

/**
 * Dev-only check that reports arrive, scrubbed: start `next dev` with
 * NEXT_PUBLIC_SENTRY_SELFTEST=<app name>. One error from the browser, one from the server.
 */
export function sentrySelfTest(where: 'browser' | 'server') {
  const selfTest = process.env.NEXT_PUBLIC_SENTRY_SELFTEST
  if (process.env.NODE_ENV !== 'development' || !selfTest || !SENTRY_DSN) return
  Sentry.captureException(
    new Error(`Sentry self-test from ${selfTest} (${where}): jo.doe@example.com, 0244 123 456 (both should read [redacted])`)
  )
}
