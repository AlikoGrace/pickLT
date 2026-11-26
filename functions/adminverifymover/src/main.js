import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;
const USERS_COLLECTION = process.env.APPWRITE_COLLECTION_USERS;
// Optional shared secret for trusted server-to-server calls from the admin web
// app. Its absence no longer weakens authorization — see authorize() below.
const ADMIN_SECRET = process.env.ADMIN_FUNCTION_SECRET;

const VALID_STATUSES = ['verified', 'rejected', 'suspended'];

// ── Document review (plan legal/7) ──────────────────────────────────────────
// Besides the profile decision, an admin reviews two documents on their own:
// the residence document (`action: 'residence'`) and the moving certificate
// (`action: 'certificate'`), each with `decision: 'verified' | 'rejected'`.
const DOCUMENT_ACTIONS = ['residence', 'certificate'];
const DOCUMENT_DECISIONS = ['verified', 'rejected'];

function isoMs(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Why a profile may not be set to `verified`, or null. A driver cannot be
 * verified before their residence document is: the lawyer's point 1 is that it
 * is reviewed before the driver can work. An expired document counts as not
 * verified. Mirrors `residenceVerifyBlock` in the admin app.
 */
export function residenceVerifyBlock(profile, nowMs) {
  if (profile?.residenceStatus !== 'verified') return 'notVerified';
  const expiresMs = isoMs(profile.residenceDocExpiresAt);
  if (expiresMs != null && nowMs >= expiresMs) return 'expired';
  return null;
}

/**
 * The columns a document decision writes, or `{ fnCode }` for a refusal.
 * Approving needs something to approve: the photographs must be on file, and a
 * residence document must not already be past its end date.
 */
export function documentDecisionPatch({ action, decision, profile, reason, adminId, nowMs }) {
  const trimmed = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';
  if (decision === 'rejected' && !trimmed) return { fnCode: 'api.mover.reasonRequired' };
  if (action === 'residence') {
    if (!profile.residenceDocFront || !profile.residenceDocBack) return { fnCode: 'api.mover.noDocument' };
    if (decision === 'verified') {
      const expiresMs = isoMs(profile.residenceDocExpiresAt);
      if (expiresMs != null && nowMs >= expiresMs) return { fnCode: 'api.mover.documentExpired' };
    }
    return {
      patch: {
        residenceStatus: decision,
        residenceRejectionReason: decision === 'rejected' ? trimmed : null,
        residenceReviewedAt: new Date(nowMs).toISOString(),
        residenceReviewedBy: adminId || null,
      },
    };
  }
  if (!profile.movingCertificatePhoto) return { fnCode: 'api.mover.noDocument' };
  return {
    patch: {
      movingCertificateStatus: decision,
      movingCertificateRejectionReason: decision === 'rejected' ? trimmed : null,
    },
  };
}

const DOCUMENT_REFUSALS = {
  'api.mover.reasonRequired': 'A reason is required when rejecting a document.',
  'api.mover.noDocument': 'There is no document on file to review.',
  'api.mover.documentExpired': 'This document has expired and cannot be approved.',
};

const DOCUMENT_COPY = {
  residence: {
    verified: {
      key: 'verification.residenceVerified',
      title: 'Residence document approved',
      body: 'Your residence document has been checked and approved.',
    },
    rejected: {
      key: 'verification.residenceRejected',
      title: 'Residence document not accepted',
      body: 'Your residence document was not accepted.',
    },
  },
  certificate: {
    verified: {
      key: 'verification.certificateVerified',
      title: 'Moving certificate approved',
      body: 'Your moving certificate has been approved. You are now shown first to clients and have no daily limit.',
    },
    rejected: {
      key: 'verification.certificateRejected',
      title: 'Moving certificate not accepted',
      body: 'Your moving certificate was not accepted.',
    },
  },
};

/** Notification copy for a document decision. A rejection always carries its reason. */
export function documentCopy(action, decision, reason) {
  const entry = DOCUMENT_COPY[action]?.[decision];
  if (!entry) return null;
  const trimmed = typeof reason === 'string' ? reason.trim() : '';
  if (decision === 'verified') return { key: entry.key, title: entry.title, body: entry.body, params: {} };
  return { key: entry.key, title: entry.title, body: `${entry.body} ${trimmed}`.trim(), params: { reason: trimmed } };
}

/** Timing-safe-ish string compare (avoids early-exit on length/first-diff). */
function secretEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Authorize the caller. Two accepted paths:
 *   1. Session-triggered execution — Appwrite populates `x-appwrite-user-id`
 *      (set by the platform, not the request body, so it cannot be forged). That
 *      user must have `userType === 'admin'`.
 *   2. Trusted-server call (the admin web app) — presents `x-admin-secret` matching
 *      ADMIN_FUNCTION_SECRET; the body `adminId` must additionally name a real admin.
 *
 * There is deliberately no fallback. This previously trusted the body's
 * `adminId` whenever ADMIN_FUNCTION_SECRET was unset — and it was unset in
 * production, so any authenticated user could verify or suspend any mover.
 * Failing closed is the only safe default for a privilege grant.
 */
async function authorize({ req, databases, adminId, log }) {
  const isAdminDoc = async (id) => {
    if (!id || !USERS_COLLECTION) return false;
    try {
      const u = await databases.getDocument(DATABASE_ID, USERS_COLLECTION, id);
      return u.userType === 'admin';
    } catch {
      return false;
    }
  };

  const callerId = req.headers['x-appwrite-user-id'];
  if (callerId) {
    // Path 1 — real authenticated session; id comes from the platform.
    if (await isAdminDoc(callerId)) return { ok: true, adminId: callerId };
    return { ok: false, reason: 'caller is not an admin' };
  }

  if (ADMIN_SECRET) {
    // Path 2 — trusted server (admin app) presenting the shared secret.
    const provided = req.headers['x-admin-secret'] || '';
    if (!secretEquals(provided, ADMIN_SECRET)) {
      return { ok: false, reason: 'missing or invalid admin secret' };
    }
    if (await isAdminDoc(adminId)) return { ok: true, adminId };
    return { ok: false, reason: 'adminId does not name an admin' };
  }

  // Fail closed. No session and no configured secret means the caller cannot
  // be authenticated, whatever the body claims.
  log(
    'adminverifymover: rejected — no authenticated session and ADMIN_FUNCTION_SECRET is not configured'
  );
  return { ok: false, reason: 'unauthorized' };
}

/**
 * Resolve `mover_profiles.userId` to a plain id. The attribute is a
 * relationship, so Appwrite hands it back either hydrated (an object) or as a
 * bare id string — and, for profiles created by an abandoned signup, as null or
 * an empty string. Returns null when there is no usable id.
 */
function resolveUserId(userId) {
  if (typeof userId === 'string') return userId.trim() || null;
  if (userId && typeof userId === 'object' && typeof userId.$id === 'string') {
    return userId.$id.trim() || null;
  }
  return null;
}

/**
 * Build the update payload, clearing a dangling `userId` link when we find one.
 *
 * `mover_profiles.userId` is a one-to-one relationship with `onDelete: setNull`,
 * but that only fires when the user is deleted through Appwrite's relationship
 * handling. A user removed any other way leaves the stale id behind, and from
 * then on Appwrite rejects EVERY update that omits `userId` with "Invalid
 * relationship value. Must be either a document, document ID or null." — which
 * is exactly what made rejecting an abandoned signup fail. Sending an explicit
 * `userId: null` alongside the status both satisfies the validator and repairs
 * the row, so the next edit succeeds on its own.
 */
async function buildUpdatePayload({ databases, moverProfileId, newStatus, log }) {
  const payload = { verificationStatus: newStatus };

  let profile;
  try {
    profile = await databases.getDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, moverProfileId);
  } catch {
    // Let the update itself surface a missing/unreadable profile.
    return payload;
  }

  const userId = resolveUserId(profile.userId);
  if (!userId) {
    // Already empty. Name it explicitly so the validator never sees '' .
    payload.userId = null;
    return payload;
  }

  if (USERS_COLLECTION) {
    try {
      await databases.getDocument(DATABASE_ID, USERS_COLLECTION, userId);
    } catch (err) {
      // Only a definitive 404 proves the link is dead. A timeout or 5xx must NOT
      // clear it — that would destroy a perfectly good relationship over a blip.
      if (err.code !== 404) {
        log(`adminverifymover: could not verify user ${userId} (${err.message}) — leaving link intact`);
        return payload;
      }
      log(
        `adminverifymover: profile ${moverProfileId} links to missing user ${userId} — clearing the dangling relationship`
      );
      payload.userId = null;
    }
  }

  return payload;
}

/**
 * Write the status-change notification. Never throws — returns false and logs
 * when the mover cannot be notified, so a broken profile link does not undo an
 * otherwise successful verification decision.
 */

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

async function notifyMover({ databases, profile, moverProfileId, newStatus, reason, log, copyOverride, extraData }) {
  const userId = resolveUserId(profile.userId);
  if (!userId) {
    log(`adminverifymover: profile ${moverProfileId} has no linked user — notification skipped`);
    return false;
  }

  // A dangling id would fail the same relationship validation, so confirm the
  // target exists rather than letting createDocument throw.
  if (USERS_COLLECTION) {
    try {
      await databases.getDocument(DATABASE_ID, USERS_COLLECTION, userId);
    } catch {
      log(`adminverifymover: linked user ${userId} not found — notification skipped`);
      return false;
    }
  }

  const copy = copyOverride ?? verificationCopy(newStatus, reason);
  if (!copy) {
    log(
      `adminverifymover: no notification copy for status '${newStatus}' — profile ${moverProfileId} was updated but the mover was NOT told. Add a VERIFICATION_COPY entry and a notifications catalog key.`,
    );
    return false;
  }

  try {
    await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), {
      userId,
      // 'verification', not 'system'. `sendpush`'s PUSHABLE_TYPES contains
      // 'verification' and does not contain 'system', so a row written as
      // 'system' is silently skipped at the push step — which is why the
      // verified / rejected / suspended push never left the building
      // (PROGRESS 2026-08-20). The row itself was always written correctly;
      // only its type stopped it being delivered.
      type: 'verification',
      title: copy.title,
      body: copy.body,
      data: JSON.stringify({
        moverProfileId,
        newStatus,
        ...(extraData || {}),
        i18nKey: copy.key,
        ...(copy.bodyKey ? { i18nBodyKey: copy.bodyKey } : {}),
        i18nParams: copy.params,
      }),
      isRead: false,
    }, [
      // Addressee only. `userId` was resolved from `profile.userId` — the
      // mover's auth account id — never from the mover_profiles $id.
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ]);
    return true;
  } catch (err) {
    log(`adminverifymover: notification write failed for ${userId}: ${err.message}`);
    return false;
  }
}

export default async ({ req, res, log, error }) => {
  // Startup assertion. A missing id used to be swallowed by a guarded
  // `if (VAR)` and the function would silently do nothing; name it instead.
  // ADMIN_FUNCTION_SECRET is optional: it enables the trusted-server auth path
  // only; session-authenticated admins work without it and authorize() already
  // fails closed when it is unset.
  const missingEnv = [
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_COLLECTION_NOTIFICATIONS',
    'APPWRITE_COLLECTION_USERS',
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
    const { moverProfileId, newStatus, adminId, reason, action, decision } = body;

    // ── Document review (plan legal/7) ──
    if (action !== undefined && action !== null) {
      if (!moverProfileId || !DOCUMENT_ACTIONS.includes(action) || !DOCUMENT_DECISIONS.includes(decision)) {
        return res.json(
          { error: 'moverProfileId, action (residence|certificate) and decision (verified|rejected) are required', fnCode: 'generic.badRequest' },
          400,
        );
      }
      const docAuth = await authorize({ req, databases, adminId, log });
      if (!docAuth.ok) {
        error(`adminverifymover: unauthorized (${docAuth.reason})`);
        return res.json({ error: `Forbidden: ${docAuth.reason}`, fnCode: 'auth.forbidden' }, 403);
      }
      let current;
      try {
        current = await databases.getDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, moverProfileId);
      } catch {
        return res.json({ error: 'Mover not found', fnCode: 'api.mover.notFound' }, 404);
      }
      const plan = documentDecisionPatch({ action, decision, profile: current, reason, adminId: docAuth.adminId, nowMs: Date.now() });
      if (plan.fnCode) {
        return res.json({ error: DOCUMENT_REFUSALS[plan.fnCode] || 'Invalid request', fnCode: plan.fnCode }, 400);
      }
      const updated = await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, moverProfileId, plan.patch);
      log(`Mover ${moverProfileId} ${action} document ${decision} by admin ${docAuth.adminId}`);
      const docNotified = await notifyMover({
        databases,
        profile: updated,
        moverProfileId,
        newStatus: decision,
        reason,
        log,
        copyOverride: documentCopy(action, decision, reason),
        extraData: { document: action },
      });
      return res.json({ success: true, profile: updated, notified: docNotified });
    }

    if (!moverProfileId || !newStatus) {
      return res.json({ error: 'moverProfileId and newStatus are required', fnCode: 'generic.badRequest' }, 400);
    }

    if (!VALID_STATUSES.includes(newStatus)) {
      return res.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, fnCode: 'api.mover.invalidStatus', fnParams: { list: VALID_STATUSES.join(', ') } }, 400);
    }

    // ── Authorization (hardened) ──
    const auth = await authorize({ req, databases, adminId, log });
    if (!auth.ok) {
      error(`adminverifymover: unauthorized (${auth.reason})`);
      return res.json({ error: `Forbidden: ${auth.reason}`, fnCode: 'auth.forbidden' }, 403);
    }
    const effectiveAdminId = auth.adminId;

    // A driver is not verified before their residence document is (plan
    // legal/7, V1). Rejecting and suspending stay possible at any time.
    if (newStatus === 'verified') {
      let current = null;
      try {
        current = await databases.getDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, moverProfileId);
      } catch {
        // Let the update below surface a missing profile.
      }
      const block = current ? residenceVerifyBlock(current, Date.now()) : null;
      if (block) {
        return res.json(
          {
            error: 'Approve the residence document before verifying this mover.',
            fnCode: block === 'expired' ? 'api.mover.residenceExpired' : 'api.mover.residenceNotVerified',
          },
          409,
        );
      }
    }

    // Update mover profile status, repairing a dangling user link if present.
    const payload = await buildUpdatePayload({ databases, moverProfileId, newStatus, log });

    let profile;
    try {
      profile = await databases.updateDocument(
        DATABASE_ID,
        MOVER_PROFILES_COLLECTION,
        moverProfileId,
        payload
      );
    } catch (err) {
      // Belt and braces: if some other relationship on the row is stale in a way
      // the pre-check could not see, retry once with the user link explicitly
      // nulled rather than failing an admin decision outright.
      if (!/relationship/i.test(err.message || '') || 'userId' in payload) throw err;
      log(`adminverifymover: update rejected (${err.message}) — retrying with userId cleared`);
      profile = await databases.updateDocument(
        DATABASE_ID,
        MOVER_PROFILES_COLLECTION,
        moverProfileId,
        { ...payload, userId: null }
      );
    }

    log(`Mover ${moverProfileId} status updated to ${newStatus} by admin ${effectiveAdminId}`);

    // Notify the mover. Best-effort by design: the status change above is the
    // operation the admin asked for and it has already committed. An abandoned
    // signup can have a mover_profiles row whose `userId` relationship is empty
    // or points at a deleted user — writing the notification then fails with
    // "Invalid relationship value", which used to bubble up as a 500 and made a
    // reject that HAD applied look like it failed.
    const notified = await notifyMover({
      databases,
      profile,
      moverProfileId,
      newStatus,
      reason,
      log,
    });

    return res.json({ success: true, profile, notified });
  } catch (err) {
    error(`Admin verify mover failed: ${err.message}`);
    return res.json({ error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
