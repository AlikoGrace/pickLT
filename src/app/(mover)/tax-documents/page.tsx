'use client'

import { DocumentTextIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

/**
 * T8: the driver's monthly tax statements (parity with the mover app's
 * "Tax & Earnings Documents"). Statements are generated on the 1st of each
 * month by the `generatetaxstatements` cron; PDFs stream through the
 * ownership-checked /api/mover/tax-statements/[id]/pdf proxy.
 */

interface Statement {
  $id: string
  period: string // '2026-08'
  number: string
  fileId: string | null
  moves: number
  grossTotal: number
  grossCash: number
  grossDigital: number
  commission: number
  net: number
}

function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return period
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function TaxDocumentsPage() {
  const [statements, setStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mover/tax-statements')
      .then((r) => r.json())
      .then((data) => setStatements(data.statements ?? []))
      .catch((err) => console.error('[tax-documents] load failed', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          Tax &amp; Earnings Documents
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Your monthly statement is generated on the 1st of each month, covering the month before.
          Keep them for your accountant or tax office.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : statements.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-10 text-center">
          <DocumentTextIcon className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 font-medium text-neutral-900 dark:text-white">No statements yet</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Complete moves this month and your first statement appears on the 1st.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {statements.map((st) => (
            <div
              key={st.$id}
              className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4"
            >
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {periodLabel(st.period)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{st.number}</p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {st.moves} moves · gross €{(st.grossTotal ?? 0).toFixed(2)} · net €
                  {(st.net ?? 0).toFixed(2)}
                </p>
              </div>
              {st.fileId ? (
                <a
                  href={`/api/mover/tax-statements/${st.$id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-primary-6000 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  Open PDF
                </a>
              ) : (
                <span className="text-sm text-neutral-400">Preparing…</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
