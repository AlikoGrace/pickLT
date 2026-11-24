/**
 * Deleting the signed-in account from the web (plan legal/3.account-deletion,
 * phase B). Web port of `lib/account.ts` in the two apps.
 *
 * The call goes straight to the `deleteaccount` Appwrite function with the
 * browser's own Appwrite session (the path `calls.ts` uses), so the function
 * sees the caller through `x-appwrite-user-id` and can check that the sign-in
 * is recent. No Next API route sits in between: a server route holds the admin
 * key and could not prove a fresh sign-in.
 *
 * `classifyDeleteResponse` is pure and is what the tests exercise.
 */

export const DELETE_ACCOUNT_FUNCTION = process.env.NEXT_PUBLIC_FUNCTION_DELETE_ACCOUNT || 'deleteaccount'

/** Refusals the user can do something about. */
export const ACCOUNT_BLOCKERS = [
  'account.activeMove',
  'account.scheduledMove',
  'account.feesOwed',
  'account.payoutPending',
  'account.adminNotDeletable',
] as const
export type AccountBlocker = (typeof ACCOUNT_BLOCKERS)[number]

export type DeleteAccountOutcome =
  /** Gone. The caller clears the session cookie and signs out. */
  | { status: 'deleted' }
  /** Refused until the user resolves something; nothing was changed. */
  | { status: 'blocked'; code: AccountBlocker }
  /** The sign-in is older than ten minutes: sign in again, then retry. */
  | { status: 'reauth' }
  /** Network or server failure. Safe to try again: the function resumes. */
  | { status: 'failed' }

/** The `errors:` key of the sentence to show for an outcome that is not success. */
// i18n-keys: errors:account.activeMove, errors:account.scheduledMove, errors:account.feesOwed
// i18n-keys: errors:account.payoutPending, errors:account.adminNotDeletable
// i18n-keys: errors:account.reauthRequired, errors:account.deletionIncomplete
export function outcomeMessageKey(outcome: Exclude<DeleteAccountOutcome, { status: 'deleted' }>): string {
  if (outcome.status === 'blocked') return `errors:${outcome.code}`
  if (outcome.status === 'reauth') return 'errors:account.reauthRequired'
  return 'errors:account.deletionIncomplete'
}

/** Pure: what the function's HTTP status and body mean for the page. */
export function classifyDeleteResponse(status: number, body: string): DeleteAccountOutcome {
  let parsed: unknown = null
  try {
    parsed = body ? JSON.parse(body) : null
  } catch {
    return { status: 'failed' }
  }
  const obj = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  if (!obj) return { status: 'failed' }
  if (status >= 200 && status < 300 && obj.ok === true) return { status: 'deleted' }
  const code = typeof obj.fnCode === 'string' ? obj.fnCode : ''
  if (code === 'account.reauthRequired') return { status: 'reauth' }
  if ((ACCOUNT_BLOCKERS as readonly string[]).includes(code)) return { status: 'blocked', code: code as AccountBlocker }
  return { status: 'failed' }
}

export async function deleteAccount(): Promise<DeleteAccountOutcome> {
  try {
    // Imported here so the pure helpers above load without the browser SDK.
    const [{ ExecutionMethod }, { functions }] = await Promise.all([import('appwrite'), import('@/lib/appwrite')])
    const execution = await functions.createExecution({
      functionId: DELETE_ACCOUNT_FUNCTION,
      body: JSON.stringify({ confirm: true }),
      async: false,
      xpath: '/',
      method: ExecutionMethod.POST,
      headers: { 'content-type': 'application/json' },
    })
    return classifyDeleteResponse(execution.responseStatusCode, execution.responseBody)
  } catch {
    return { status: 'failed' }
  }
}

/** The marker `deleteaccount` leaves in `fullName` / `displayName`. */
export const DELETED_NAME = 'deleted'

/** A counterparty's name: "Deleted user" (translated by the caller) for a tombstone. */
export function displayNameOf(name: unknown, deletedLabel: string, fallback: string): string {
  if (typeof name === 'string' && name.trim() === DELETED_NAME) return deletedLabel
  const trimmed = typeof name === 'string' ? name.trim() : ''
  return trimmed || fallback
}
