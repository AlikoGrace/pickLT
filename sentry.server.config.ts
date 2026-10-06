// Sentry on the Node.js server (API routes, server components). Plan sentry.md.
import * as Sentry from '@sentry/nextjs'

import { sentryOptions, sentrySelfTest } from '@/lib/sentry-options'

Sentry.init(sentryOptions())
sentrySelfTest('server')
