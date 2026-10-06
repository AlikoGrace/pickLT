'use client'

// Last-resort error page for crashes in the root layout itself; reports the
// error to Sentry (plan sentry.md). Plain markup: the layout, theme and
// translations are what failed, so none of them can be relied on here.
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: 16 }}>Please try again.</p>
          <button
            onClick={reset}
            style={{ background: '#1D64EC', color: '#fff', border: 0, borderRadius: 999, padding: '10px 20px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
