// Sentry in the browser (plan sentry.md). Reports go through the /monitoring
// tunnel on our own domain so ad blockers don't drop them.
//
// Consent-gated (plan legal/6.web-cleanup.md, W3): the browser SDK starts only
// when the `picklt_consent` cookie says `monitoring: true`. Without a choice, or
// after "Only necessary", nothing is initialised and nothing is sent. Changing
// the choice to no takes effect on the next page load. Server and edge Sentry
// (sentry.server.config.ts, sentry.edge.config.ts) are not affected.
import * as Sentry from '@sentry/nextjs'

import { monitoringAllowed } from '@/lib/cookie-consent'
import { sentryOptions, sentrySelfTest } from '@/lib/sentry-options'

if (typeof document !== 'undefined' && monitoringAllowed(document.cookie)) {
  Sentry.init(sentryOptions())
  sentrySelfTest('browser')
}

// A no-op while Sentry is not initialised.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
