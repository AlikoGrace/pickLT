// Sentry in the browser (plan sentry.md). Reports go through the /monitoring
// tunnel on our own domain so ad blockers don't drop them.
import * as Sentry from '@sentry/nextjs'

import { sentryOptions } from '@/lib/sentry-options'

Sentry.init(sentryOptions())

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
