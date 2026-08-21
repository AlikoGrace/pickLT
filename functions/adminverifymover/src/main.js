import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;

const VALID_STATUSES = ['verified', 'rejected', 'suspended'];

// i18n wire contract (plan 11 §S1/S2). A notification row carries a KEY, not a
// finished sentence: `sendpush` resolves it in the recipient's locale before it
// reaches FCM, and the in-app list re-resolves it at read time so notification
// history follows a language switch. `title`/`body` keep an English rendering as
// the wire-compatible fallback.
//
//   data.i18nKey       base key in the `notifications` namespace;
//                      title = `<key>.title`, body = `<key>.body`
//   data.i18nBodyKey   optional full key, when the body is not `<key>.body`
//   data.i18nParams    interpolation params

// Three complete sentences, selected by status — NOT `'Profile ' + titleCase(
// newStatus)`. That concatenation was untranslatable by construction: it glued
// an English noun to a title-cased raw status code, and there is no target
// language in which "Profil " + "Verified" is a sentence. Turkish needs
// "Profiliniz doğrulandı" — a different word order *and* a possessive suffix on
// the noun. Wrapping the concatenation in t() cannot express that; only a whole
// key per status can.
//
// The operator's free-text `reason` rides in as {{reason}} and is deliberately
// NOT translated — an admin typed it, in whatever language they typed it. When
// there is none, a second complete key carries the contact-support sentence, so
// the fallback is a translatable unit rather than an English tail spliced on.
const VERIFICATION_COPY = {
  verified: {
    key: 'verification.verified',
    title: 'Profile verified',
    body: 'Congratulations! Your mover profile has been verified. You can now accept moves.',
  },
  rejected: {
    key: 'verification.rejected',
    title: 'Profile rejected',
    body: 'Your mover profile application has been rejected.',
  },
  suspended: {
    key: 'verification.suspended',
    title: 'Account suspended',
    body: 'Your mover account has been suspended.',
  },
};

const CONTACT_SUPPORT_EN = 'Please contact support for details.';

/**
 * Notification copy for a verification decision, or null for a status this
 * function has no sentence for.
 *
 * Returning null (and letting the caller log loudly) is a deliberate behaviour
 * change: the previous code would happily title-case any unknown status into
 * "Profile Pending" and push it. A status nobody wrote copy for must produce no
 * notification, not an English-shaped guess.
 */
function verificationCopy(newStatus, reason) {
  const entry = VERIFICATION_COPY[newStatus];
  if (!entry) return null;
  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
  // `verified` is unconditional good news and takes no reason.
  if (newStatus === 'verified') {
    return { key: entry.key, title: entry.title, body: entry.body, params: {} };
  }
  return {
    key: entry.key,
    ...(trimmedReason ? {} : { bodyKey: `${entry.key}.bodyNoReason` }),
    title: entry.title,
    body: `${entry.body} ${trimmedReason || CONTACT_SUPPORT_EN}`,
    params: { reason: trimmedReason },
  };
}

export default async ({ req, res, log, error }) => {
  // Startup assertion. A missing id used to be swallowed by a guarded
  // `if (VAR)` and the function would silently do nothing; name it instead.
  const missingEnv = [
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_COLLECTION_NOTIFICATIONS',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[adminverifymover] missing env: ${missingEnv.join(', ')}`);
    return res.json({ error: 'misconfigured', fnCode: 'generic.misconfigured' }, 500);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const databases = new Databases(client);

  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed', fnCode: 'generic.methodNotAllowed' }, 405);
  }

  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      return res.json({ error: 'Invalid JSON body', fnCode: 'generic.badRequest' }, 400);
    }
    const { moverProfileId, newStatus, adminId, reason } = body;

    if (!moverProfileId || !newStatus || !adminId) {
      return res.json({ error: 'moverProfileId, newStatus, and adminId are required', fnCode: 'generic.badRequest' }, 400);
    }

    if (!VALID_STATUSES.includes(newStatus)) {
      return res.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, fnCode: 'api.mover.invalidStatus', fnParams: { list: VALID_STATUSES.join(', ') } }, 400);
    }

    // Update mover profile status
    const profile = await databases.updateDocument(
      DATABASE_ID,
      MOVER_PROFILES_COLLECTION,
      moverProfileId,
      { verificationStatus: newStatus }
    );

    // Notify the mover
    const userId = typeof profile.userId === 'string' ? profile.userId : profile.userId.$id;
    const copy = verificationCopy(newStatus, reason);

    if (!copy) {
      error(
        `[adminverifymover] no notification copy for status '${newStatus}' — profile ${moverProfileId} was updated but the mover was NOT told. Add a VERIFICATION_COPY entry and a notifications catalog key.`,
      );
    } else {
      await databases.createDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION,
        ID.unique(),
        {
          userId,
          // `verification` is in sendpush's PUSHABLE_TYPES and in the live
          // notifications.type enum; `system` is in neither, so setting it here
          // silently dropped the push telling a mover they had been verified,
          // rejected or suspended — the one notification that decides whether
          // they can accept work at all.
          type: 'verification',
          title: copy.title,
          body: copy.body,
          data: JSON.stringify({
            moverProfileId,
            newStatus,
            i18nKey: copy.key,
            ...(copy.bodyKey ? { i18nBodyKey: copy.bodyKey } : {}),
            i18nParams: copy.params,
          }),
          isRead: false,
        },
        [
          // `userId` here was resolved off mover_profiles.userId above —
          // mover_profiles.$id is NOT an auth account id, notifications.userId
          // is. `update` is required by markAsRead / markAllAsRead.
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      );
    }

    log(`Mover ${moverProfileId} status updated to ${newStatus} by admin ${adminId}`);

    return res.json({ success: true, profile });
  } catch (err) {
    error(`Admin verify mover failed: ${err.message}`);
    return res.json({ error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
