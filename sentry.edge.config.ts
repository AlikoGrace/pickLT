// Sentry in the edge runtime (middleware). Plan sentry.md.
import * as Sentry from '@sentry/nextjs'

import { sentryOptions } from '@/lib/sentry-options'

Sentry.init(sentryOptions())
