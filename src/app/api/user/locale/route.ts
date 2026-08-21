import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { isLocale } from '@/lib/i18n-config'

/**
 * POST /api/user/locale
 *
 * Mirrors the visitor's chosen UI language onto their `users` document, so the
 * Appwrite functions that write notifications and the tax PDF can address them
 * in it (master plan D8, `11.server-messages.md` Task 2).
 *
 * The web app has no `updateprofile` function id configured — the two RN apps
 * reach the same column through that function, this repo reaches it through the
 * admin client it already uses for every other profile write. Same column, same
 * validation list, one fewer piece of console configuration.
 *
 * Deliberately soft in three places:
 *
 *  - **Signed out is not an error.** The language dropdown sits in the public
 *    header, and an anonymous visitor switching to Polish is a perfectly good
 *    outcome that simply has no document to record it on. 204, not 401.
 *  - **A missing `locale` column is not an error.** Appwrite rejects the whole
 *    update on an unknown attribute, and the column is an operator action
 *    (OA-1) that may not have landed yet. Log and return 204.
 *  - **The caller never waits.** The cookie has already switched the UI; this
 *    is bookkeeping for a later push notification.
 *
 * Body: `{ locale: string }` — validated against the eight supported tags, so a
 * hostile caller cannot write an arbitrary string into a field the notification
 * functions switch on.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const locale = (body as { locale?: unknown }).locale

  if (!isLocale(locale)) {
    return NextResponse.json({ error: 'invalid_locale', code: 'profile.invalidLocale' }, { status: 400 })
  }

  const userId = await getSessionUserId()
  if (!userId) return new NextResponse(null, { status: 204 })

  try {
    const { databases } = createAdminClient()
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.USERS,
      userId,
      { locale }
    )
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.warn(
      `[user/locale] locale not stored for ${userId} (is the \`locale\` attribute on the users collection?):`,
      err instanceof Error ? err.message : err
    )
    return new NextResponse(null, { status: 204 })
  }
}
