/**
 * Read-time resolution of stored notification rows
 * (`.agent/plans/i18n/11.server-messages.md` §S1, Task 9 — web surface).
 *
 * A `notifications` row stores a KEY plus params, not a finished sentence, so
 * that notification *history* follows a language switch. `sendpush` resolves it
 * for the OS push; every in-app list — the two React Native screens and
 * `Header/NotifyDropdown.tsx` on web — must resolve it again at render time.
 *
 * These tests drive the same helper the dropdown calls, against the real
 * `en`/`de` catalogs, because a hand-written fixture catalog would pass while
 * the shipped one was missing the key.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createInstance, type TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'
import { parseNotificationData, resolveNotificationText } from '../notification-i18n'

function catalog(locale: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, `../../locales/${locale}/notifications.json`), 'utf8')
  ) as Record<string, unknown>
}

/** A `t` for one locale, wired to the shipped `notifications` namespace only. */
function tFor(lng: string): TFunction {
  const instance = createInstance()
  instance.init({
    lng,
    fallbackLng: 'en',
    ns: ['notifications'],
    defaultNS: 'notifications',
    resources: {
      en: { notifications: catalog('en') },
      de: { notifications: catalog('de') },
    },
    interpolation: { escapeValue: false },
  })
  return instance.t
}

const en = tFor('en')
const de = tFor('de')

/** The English fallback a writer stores alongside the key. */
const STORED_TITLE = 'Mover arrived'
const STORED_BODY = 'Your mover has arrived at the pickup location.'

describe('resolveNotificationText', () => {
  it('renders the catalog string for the active locale when the row carries an i18nKey', () => {
    const row = {
      title: STORED_TITLE,
      body: STORED_BODY,
      data: JSON.stringify({ moveId: 'abc', i18nKey: 'status.moverArrived' }),
    }

    expect(resolveNotificationText(row, de)).toEqual({
      title: 'Umzugsprofi eingetroffen',
      body: 'Ihr Umzugsprofi ist an der Abholadresse eingetroffen.',
    })

    // The same row, same fetch, different active language — this is the
    // property the whole wire contract exists to deliver.
    expect(resolveNotificationText(row, en)).toEqual({
      title: STORED_TITLE,
      body: STORED_BODY,
    })
  })

  it('interpolates i18nParams into the resolved string', () => {
    const row = {
      title: 'Move cancelled',
      body: 'The client cancelled move MV-1234.',
      data: JSON.stringify({
        i18nKey: 'cancel.byClient',
        i18nBodyKey: 'cancel.byClient.bodyWithHandle',
        i18nParams: { handle: 'MV-1234' },
      }),
    }

    expect(resolveNotificationText(row, de)).toEqual({
      title: 'Umzug storniert',
      body: 'Der Kunde hat den Umzug MV-1234 storniert.',
    })
  })

  it('falls back to the stored text for a legacy row with no i18nKey', () => {
    const row = {
      title: STORED_TITLE,
      body: STORED_BODY,
      data: JSON.stringify({ moveId: 'abc' }),
    }

    // Rows written before the contract existed must keep rendering, in every
    // language — there is no backfill.
    expect(resolveNotificationText(row, de)).toEqual({ title: STORED_TITLE, body: STORED_BODY })
    expect(resolveNotificationText(row, en)).toEqual({ title: STORED_TITLE, body: STORED_BODY })
  })

  it('falls back to the stored text when the key no longer resolves', () => {
    const row = {
      title: STORED_TITLE,
      body: STORED_BODY,
      data: JSON.stringify({ i18nKey: 'status.keyRemovedInALaterRelease' }),
    }

    const resolved = resolveNotificationText(row, de)
    // Never blank, and never a raw key on screen.
    expect(resolved).toEqual({ title: STORED_TITLE, body: STORED_BODY })
    expect(resolved.title).not.toContain('status.')
  })

  it('keeps user-authored body text when i18nBodyKey is explicitly null', () => {
    // `sendmessage`: the title is a catalog string, the body is the user's own
    // message preview and must never be replaced by one.
    const row = {
      title: 'New message',
      body: 'See you at 9 by the loading bay',
      data: JSON.stringify({ i18nKey: 'message.new', i18nBodyKey: null }),
    }

    expect(resolveNotificationText(row, de)).toEqual({
      title: 'Neue Nachricht',
      body: 'See you at 9 by the loading bay',
    })
  })

  it('distinguishes an explicit null i18nBodyKey from an absent one', () => {
    const stored = { title: 'New message', body: 'See you at 9 by the loading bay' }

    // Absent → derive `<stem>.body`. `message.new` has no `.body`, so the
    // stored text survives anyway — but by the miss path, not by the null path.
    const absent = resolveNotificationText(
      { ...stored, data: JSON.stringify({ i18nKey: 'message.new' }) },
      de
    )
    expect(absent.body).toBe(stored.body)

    // A stem that DOES have a `.body` proves the two paths differ: null keeps
    // the user's text, absent replaces it.
    const withNull = resolveNotificationText(
      {
        title: STORED_TITLE,
        body: 'a review comment, written by a human',
        data: JSON.stringify({ i18nKey: 'status.moverArrived', i18nBodyKey: null }),
      },
      de
    )
    expect(withNull.body).toBe('a review comment, written by a human')

    const withoutNull = resolveNotificationText(
      {
        title: STORED_TITLE,
        body: 'a review comment, written by a human',
        data: JSON.stringify({ i18nKey: 'status.moverArrived' }),
      },
      de
    )
    expect(withoutNull.body).toBe('Ihr Umzugsprofi ist an der Abholadresse eingetroffen.')
  })

  it('honours i18nTitleKey as a full key override', () => {
    const row = {
      title: STORED_TITLE,
      body: STORED_BODY,
      data: JSON.stringify({
        i18nKey: 'status.moverArrived',
        i18nTitleKey: 'cancel.byClient.title',
      }),
    }

    expect(resolveNotificationText(row, de).title).toBe('Umzug storniert')
  })

  it('survives malformed, absent, and non-object data', () => {
    const stored = { title: STORED_TITLE, body: STORED_BODY }

    for (const data of [null, undefined, '', '   ', '{not json', '[]', '42', '"a string"']) {
      expect(resolveNotificationText({ ...stored, data }, de)).toEqual(stored)
    }
  })

  it('renders empty strings rather than undefined when the row has no text at all', () => {
    expect(resolveNotificationText({ title: null, body: null, data: null }, de)).toEqual({
      title: '',
      body: '',
    })
  })
})

describe('parseNotificationData', () => {
  it('returns the object for well-formed JSON', () => {
    expect(parseNotificationData('{"moveId":"abc"}')).toEqual({ moveId: 'abc' })
  })

  it('returns {} for anything that is not a JSON object', () => {
    for (const raw of [null, undefined, '', 'null', '[]', '7', 'oops', '{"a":']) {
      expect(parseNotificationData(raw)).toEqual({})
    }
  })
})
