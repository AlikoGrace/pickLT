import type { TFunction } from 'i18next'

/**
 * Read-time resolution of a `notifications` row (plan 11 §S1, Task 9).
 *
 * A row carries a KEY, not a finished sentence: `src/lib/notify.ts` and the
 * Appwrite writers store `data.i18nKey` (+ optional overrides and params)
 * alongside an ENGLISH `title`/`body` that exists only as the fallback of last
 * resort. `sendpush` resolves the key for the OS push; every in-app list must
 * resolve it again at render time, which is the whole point of the contract —
 * it is what makes notification *history* follow a language switch instead of
 * staying frozen in whatever language it was sent in.
 *
 * The wire contract, identical to the one `sendpush` implements:
 *
 *   data.i18nKey       stem in the `notifications` namespace;
 *                      title = `<stem>.title`, body = `<stem>.body`
 *   data.i18nTitleKey  optional FULL key, when the title is not `<stem>.title`
 *   data.i18nBodyKey   optional FULL key; an explicit `null` means "never
 *                      translate the body" — it is user-authored text
 *                      (a chat message preview, a review comment)
 *   data.i18nParams    interpolation params, pre-formatted per conventions §3.4
 *
 * `null` is therefore MEANINGFUL and is distinguished from absent: presence of
 * the property is what is checked, never its truthiness. Replacing a user's own
 * message text with a catalog string would be worse than leaving it English.
 *
 * Every failure path lands on the stored `title`/`body`: no `data` at all, a
 * malformed `data` blob, a row written before this contract existed, or a key
 * that has since been removed from the catalog. A notification row must never
 * render blank and must never render a raw key.
 */

const NAMESPACE = 'notifications'

export interface NotificationLike {
  title?: string | null
  body?: string | null
  data?: string | null
}

/**
 * `data` is a text column holding JSON. Anything that is not a JSON object —
 * absent, empty, malformed, an array, a bare number — yields `{}` so callers
 * can read it without a guard.
 */
export function parseNotificationData(raw: string | null | undefined): Record<string, unknown> {
  if (typeof raw !== 'string' || raw.trim() === '') return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * Resolve one side (title or body).
 *
 *  - a `string` override wins,
 *  - an explicit `null` override means "keep the stored text" (user-authored),
 *  - absent falls back to the stem-derived key,
 *  - no stem at all means a legacy row: keep the stored text.
 */
function keyFor(
  data: Record<string, unknown>,
  overrideField: string,
  stem: string | null,
  suffix: string
): string | null {
  const override = data[overrideField]
  if (typeof override === 'string' && override) return override
  if (Object.prototype.hasOwnProperty.call(data, overrideField)) return null
  return stem ? `${stem}.${suffix}` : null
}

/**
 * i18next answers an unknown key with the key itself — the one thing that must
 * never reach the screen. Render, then compare against both the namespaced and
 * the bare form (i18next strips the `ns:` prefix in its miss return) and fall
 * back to the stored English when they match.
 */
function render(
  key: string | null,
  params: Record<string, unknown>,
  stored: string,
  t: TFunction
): string {
  if (!key) return stored
  const full = `${NAMESPACE}:${key}`
  let rendered: string
  try {
    rendered = t(full, params) as string
  } catch {
    return stored
  }
  if (typeof rendered !== 'string' || !rendered) return stored
  if (rendered === full || rendered === key) return stored
  return rendered
}

/**
 * The stored `title`/`body` re-rendered in the active language. Pass the `t`
 * from `useTranslation()` in a client component, or from
 * `getTranslations(locale)` on the server — this helper is runtime-agnostic and
 * deliberately holds no i18next instance of its own.
 */
export function resolveNotificationText(
  item: NotificationLike,
  t: TFunction
): { title: string; body: string } {
  const storedTitle = item.title ?? ''
  const storedBody = item.body ?? ''

  const data = parseNotificationData(item.data)
  const stem = typeof data.i18nKey === 'string' && data.i18nKey ? data.i18nKey : null

  const titleKey = keyFor(data, 'i18nTitleKey', stem, 'title')
  const bodyKey = keyFor(data, 'i18nBodyKey', stem, 'body')
  if (!titleKey && !bodyKey) return { title: storedTitle, body: storedBody }

  const params =
    data.i18nParams && typeof data.i18nParams === 'object' && !Array.isArray(data.i18nParams)
      ? (data.i18nParams as Record<string, unknown>)
      : {}

  return {
    title: render(titleKey, params, storedTitle, t),
    body: render(bodyKey, params, storedBody, t),
  }
}
