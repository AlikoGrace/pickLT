'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/context/auth'
import { deleteAccount, outcomeMessageKey, type DeleteAccountOutcome } from '@/lib/account-delete'

/**
 * "Delete account" for the client account page and the mover settings page
 * (plan legal/3.account-deletion, phase B). The web had no way to delete an
 * account at all.
 *
 * `mover` adds the sentence about what the law keeps.
 */
export default function DeleteAccountSection({ mover = false, className }: { mover?: boolean; className?: string }) {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<Exclude<DeleteAccountOutcome, { status: 'deleted' }> | null>(null)
  const [done, setDone] = useState(false)

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    setProblem(null)
    const outcome = await deleteAccount()
    setBusy(false)
    if (outcome.status === 'deleted') {
      setDone(true)
      setOpen(false)
      // The Appwrite session died with the account; this clears our own
      // cookie and the signed-in state, and the layout sends the user away.
      await logout()
      return
    }
    setProblem(outcome)
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setProblem(null)
          setOpen(true)
        }}
        className="w-full rounded-2xl border border-red-200 p-4 text-center font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        {t('profile:menu.deleteAccount.label')}
      </button>
      {done && (
        <p role="status" className="mt-3 text-center text-sm text-neutral-600 dark:text-neutral-300">
          {t('profile:deleteAccount.done.body')}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
            <h3 id="delete-account-title" className="mb-3 text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {t('profile:deleteAccount.confirm.title')}
            </h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{t('profile:deleteAccount.confirm.body')}</p>
            {mover && (
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                {t('profile:deleteAccount.confirm.moverNote.body')}
              </p>
            )}

            {problem && (
              <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                <p className="font-semibold">
                  {problem.status === 'reauth'
                    ? t('profile:deleteAccount.reauth.title')
                    : problem.status === 'blocked'
                      ? t('profile:deleteAccount.blocked.title')
                      : t('profile:deleteAccount.failed.title')}
                </p>
                <p>
                  {problem.status === 'reauth' ? t('profile:deleteAccount.reauth.body') : t(outcomeMessageKey(problem))}
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 rounded-full bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {t('common:action.cancel.cta')}
              </button>
              {problem?.status === 'reauth' ? (
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex-1 rounded-full border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {t('common:action.logout.cta')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void confirm()}
                  disabled={busy || problem?.status === 'blocked'}
                  aria-busy={busy}
                  className="flex-1 rounded-full border border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {busy ? '…' : t('common:action.delete.cta')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
