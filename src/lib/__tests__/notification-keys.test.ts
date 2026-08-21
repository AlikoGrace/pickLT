/**
 * Notification key coverage (`.agent/plans/i18n/11.server-messages.md` Task 8).
 *
 * Every `notifications` row this repo writes carries `data.i18nKey` instead of
 * a frozen sentence, so that `sendpush` can render it in the recipient's locale
 * and the in-app list can re-render it after a language switch. That contract
 * is only as good as the keys: an `i18nKey` with no catalog entry silently
 * degrades every recipient to the stored English fallback, and nothing at
 * runtime complains.
 *
 * So: scan the API routes for the keys they emit, and assert each one resolves
 * to a real `<key>.title` / `<key>.body` pair (or, for a plural body, to its
 * CLDR-suffixed forms) in `en/notifications.json`. Reading the routes as text
 * rather than importing them is deliberate — they are Next.js route handlers
 * that open an admin Appwrite client, and this suite is a `src/lib` node-env
 * one. A regex over the source catches a hand-typed key, which is the actual
 * failure mode.
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { statusNotification } from '../notify'

const API_ROOT = path.resolve(__dirname, '../../app/api')
const NOTIFICATIONS = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../locales/en/notifications.json'), 'utf8')
) as Record<string, unknown>

/** Every `moves.status` value that produces a client notification. */
const NOTIFYING_STATUSES = [
  'mover_accepted',
  'mover_en_route',
  'mover_arrived',
  'loading',
  'in_transit',
  'arrived_destination',
  'unloading',
  'awaiting_payment',
  'completed',
  'cancelled_by_mover',
]

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, seg) =>
      node && typeof node === 'object' ? (node as Record<string, unknown>)[seg] : undefined,
    NOTIFICATIONS
  )
}

/** A key resolves if it is a string, or a plural family (`key_one`, …). */
function resolves(key: string): boolean {
  if (typeof lookup(key) === 'string') return true
  const parent = key.slice(0, key.lastIndexOf('.'))
  const leaf = key.slice(key.lastIndexOf('.') + 1)
  const node = lookup(parent)
  if (!node || typeof node !== 'object') return false
  return Object.keys(node as Record<string, unknown>).some((k) => k.startsWith(`${leaf}_`))
}

/** Route files under `src/app/api`, recursively. */
function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return routeFiles(full)
    return e.name === 'route.ts' ? [full] : []
  })
}

const SOURCES = routeFiles(API_ROOT).map((file) => ({
  file: path.relative(API_ROOT, file),
  text: fs.readFileSync(file, 'utf8'),
}))

describe('notification i18n keys', () => {
  it('every writeNotification call carries an i18n spec', () => {
    const offenders = SOURCES.filter(
      (s) =>
        s.text.includes('writeNotification({') &&
        s.text.split('writeNotification({').length - 1 !==
          s.text.split(/\bi18n:\s*\{/).length - 1
    ).map((s) => s.file)
    expect(offenders).toEqual([])
  })

  it('every emitted base key has a title and a body in en/notifications.json', () => {
    const keys = new Set<string>()
    for (const { text } of SOURCES) {
      for (const m of text.matchAll(/\bi18n:\s*\{[^}]*?\bkey:\s*'([^']+)'/g)) keys.add(m[1])
    }
    // Guard against the regex quietly matching nothing after a refactor.
    expect(keys.size).toBeGreaterThanOrEqual(5)
    const missing = [...keys].filter((k) => !resolves(`${k}.title`) || !resolves(`${k}.body`))
    expect(missing).toEqual([])
  })

  it('every emitted override key (bodyKey / titleKey) resolves', () => {
    const keys = new Set<string>()
    for (const { text } of SOURCES) {
      for (const m of text.matchAll(/\b(?:bodyKey|titleKey):\s*'([^']+)'/g)) keys.add(m[1])
    }
    expect([...keys].filter((k) => !resolves(k))).toEqual([])
  })

  it('every notifying move status maps to a resolvable key', () => {
    for (const status of NOTIFYING_STATUSES) {
      const notif = statusNotification(status)
      expect(notif, status).not.toBeNull()
      expect(resolves(`${notif!.i18nKey}.title`), `${status} → ${notif!.i18nKey}.title`).toBe(true)
      expect(resolves(`${notif!.i18nKey}.body`), `${status} → ${notif!.i18nKey}.body`).toBe(true)
    }
  })

  it('the stored fallback is English, not the acting user’s language', () => {
    // `sendpush` and the in-app list fall back to these when they cannot
    // resolve the key, so a German mover advancing a status must not freeze
    // German into an English-speaking client's row.
    const notif = statusNotification('completed')
    expect(notif?.title).toMatch(/^[\x20-\x7E]+$/)
    expect(notif?.body).toMatch(/^[\x20-\x7E]+$/)
  })

  it('an unknown status still carries no notification', () => {
    expect(statusNotification('draft')).toBeNull()
  })
})
