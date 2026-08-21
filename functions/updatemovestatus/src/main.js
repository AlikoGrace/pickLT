import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const MOVE_STATUS_HISTORY_COLLECTION = process.env.APPWRITE_COLLECTION_MOVE_STATUS_HISTORY;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;

// Valid status transitions.
//
// Cash flow: unloading → awaiting_payment → (BOTH parties confirm via the
// `confirmpayment` function) → completed. `awaiting_payment` deliberately has
// NO path to `completed` or `paid` here: only `confirmpayment` may close a
// move out of it, and only once the client and the mover have each stamped
// their column on the payment row. Allowing the mover to drive
// awaiting_payment → completed let one side finish a move on its own say-so.
//
// Card flow: the client pays through Stripe (chargemove sets `paid`), then the
// mover closes the job — which is why `paid → completed` stays.
const VALID_TRANSITIONS = {
  draft: ['pending_payment', 'booked', 'cancelled_by_client'],
  booked: ['paid', 'pending_payment', 'mover_assigned', 'mover_accepted', 'cancelled_by_client'],
  pending_payment: ['paid', 'cancelled_by_client'],
  paid: ['mover_assigned', 'mover_accepted', 'completed', 'cancelled_by_client'],
  mover_assigned: ['mover_accepted', 'cancelled_by_mover'],
  mover_accepted: ['mover_en_route', 'cancelled_by_mover', 'cancelled_by_client'],
  mover_en_route: ['mover_arrived', 'cancelled_by_mover'],
  mover_arrived: ['loading'],
  loading: ['in_transit'],
  in_transit: ['arrived_destination'],
  arrived_destination: ['unloading'],
  unloading: ['awaiting_payment'],
  awaiting_payment: ['cancelled_by_client', 'cancelled_by_mover'],
  completed: ['disputed'],
  cancelled_by_client: [],
  cancelled_by_mover: [],
  disputed: ['completed'],
};

// i18n wire contract (plan 11 §S1/S2). A notification row carries a KEY, not a
// finished sentence: `sendpush` resolves it in the recipient's locale before it
// reaches FCM, and the in-app list re-resolves it at read time so notification
// history follows a language switch. `title`/`body` keep an English rendering as
// the wire-compatible fallback — an old client, a missing key, a missing user
// document or an absent locale all land on it, and a push is never lost to a
// translation problem.
//
//   data.i18nKey       base key in the `notifications` namespace;
//                      title = `<key>.title`, body = `<key>.body`
//   data.i18nTitleKey  optional full key, when the title is not `<key>.title`
//   data.i18nBodyKey   optional full key; `null` means "never translate the
//                      body" (it is user-authored text) — use the stored one
//   data.i18nParams    interpolation params, pre-formatted per conventions §3.4
//
// `key` here is the base; the English pair beside it is the fallback and is the
// same copy that seeds `en/notifications.json`. Adding a status to
// VALID_TRANSITIONS without adding a row here is caught by the key-coverage test.
const NOTIFICATION_MESSAGES = {
  mover_accepted: { key: 'status.moverAccepted', title: 'Mover Accepted', body: 'A mover has accepted your move request!' },
  mover_en_route: { key: 'status.moverEnRoute', title: 'Mover En Route', body: 'Your mover is on the way to your pickup location.' },
  mover_arrived: { key: 'status.moverArrived', title: 'Mover Arrived', body: 'Your mover has arrived at the pickup location.' },
  loading: { key: 'status.loading', title: 'Loading Started', body: 'Your items are being loaded.' },
  in_transit: { key: 'status.inTransit', title: 'In Transit', body: 'Your items are on the way to the destination.' },
  arrived_destination: { key: 'status.arrivedDestination', title: 'Arrived', body: 'Your mover has arrived at the destination.' },
  unloading: { key: 'status.unloading', title: 'Unloading', body: 'Your items are being unloaded.' },
  awaiting_payment: { key: 'status.awaitingPayment', title: 'Payment Due', body: 'Your move is done — please confirm payment.' },
  completed: { key: 'status.completed', title: 'Move Completed', body: 'Your move has been completed! Please leave a review.' },
  cancelled_by_mover: { key: 'status.cancelledByMover', title: 'Move Cancelled', body: 'The mover has cancelled this move.' },
};

function relId(v) {
  if (!v) return null;
  return typeof v === 'string' ? v : (v.$id ?? null);
}

// "The mover is physically on this job", as opposed to merely holding it.
// Mirrors UNDERWAY_STATUSES in lib/queue-ux.ts — the shared source of truth,
// which `acceptmove` and `cancelmove` also mirror. Drives
// `moves.moverQueuedBehind`; keep the four in sync.
const QUEUE_UNDERWAY = new Set([
  'mover_en_route',
  'mover_arrived',
  'loading',
  'in_transit',
  'arrived_destination',
  'unloading',
  'awaiting_payment',
  'paid',
]);

/**
 * Restate `moverQueuedBehind` across everything this mover still holds.
 *
 * That flag says "the mover who accepted your move was already partway through
 * another job". It lives on the WAITING client's own move row because that
 * client cannot see the mover's other jobs — it has no read permission on
 * them — so only the server can tell it. Which means every time the mover's
 * queue changes shape, the server has to restate it:
 *
 *   - the blocking job hits `completed` (or is cancelled) → it drops out of the
 *     query below, nothing is underway any more, and the waiting client's
 *     screen stops saying "finishing another job" instead of waiting for the
 *     next accept to correct it;
 *   - the mover presses Start Route on one of two accepted jobs → that one is
 *     now underway, so the OTHER one must start saying it.
 *
 * One query, and it writes only rows whose flag is actually wrong — a mover
 * holding a single job (the overwhelming case) costs one list and no writes.
 *
 * FAIL-OPEN: this is cosmetic state on someone else's move. A failure here must
 * never fail the status transition the mover just made, so every error is
 * logged and swallowed. Mirrors `queuedBehindUpdates` in lib/queue-ux.ts.
 */
async function syncQueuedBehind(databases, moverProfileId, changed, log, error) {
  if (!moverProfileId) return;
  try {
    const held = await databases.listDocuments(DATABASE_ID, MOVES_COLLECTION, [
      Query.equal('moverProfileId', moverProfileId),
      Query.equal('status', ['mover_accepted', ...QUEUE_UNDERWAY]),
      Query.limit(50),
    ]);
    // The row we just wrote may still read back at its old status, so take our
    // own word for it rather than the query's.
    const rows = held.documents.map((m) =>
      m.$id === changed.moveId ? { ...m, status: changed.newStatus } : m,
    );
    const anyUnderway = (exceptId) =>
      rows.some((m) => m.$id !== exceptId && QUEUE_UNDERWAY.has(m.status));

    await Promise.all(
      rows
        .filter((m) => m.status === 'mover_accepted' && m.$id !== changed.moveId)
        .filter((m) => (m.moverQueuedBehind ?? false) !== anyUnderway(m.$id))
        .map((m) =>
          databases
            .updateDocument(DATABASE_ID, MOVES_COLLECTION, m.$id, {
              moverQueuedBehind: anyUnderway(m.$id),
            })
            .then(() => log(`moverQueuedBehind=${anyUnderway(m.$id)} on queued move ${m.$id}`))
            .catch((e) => error(`queued-behind sync: ${m.$id} not updated: ${e.message}`)),
        ),
    );
  } catch (e) {
    error(`queued-behind sync failed for mover ${moverProfileId}: ${e.message}`);
  }
}

// Status → pushable notification type. Anything not listed pushes as `system`
// (silent). Keep the pushable values in step with sendpush PUSHABLE_TYPES and
// the notifications.type enum.
const STATUS_PUSH_TYPE = {
  mover_accepted: 'move_accepted',
  mover_en_route: 'mover_en_route',
  mover_arrived: 'mover_arrived',
  // The four below are NOT yet in the notifications.type enum. The write below
  // falls back to `system` until they are added, so this is safe to ship first.
  loading: 'loading',
  in_transit: 'in_transit',
  arrived_destination: 'arrived_destination',
  unloading: 'unloading',
  awaiting_payment: 'payment',
  paid: 'payment',
  completed: 'move_completed',
  cancelled_by_mover: 'move_cancelled',
};

export default async ({ req, res, log, error }) => {
  // Keep-warm ping (scheduled trigger): short-circuit before any work so the
  // container stays hot. Every phase advance is a tap the mover waits on in
  // real time, so a cold start here is felt directly.
  if (req.headers['x-appwrite-trigger'] === 'schedule') {
    return res.json({ ok: true, warm: true });
  }

  // Startup assertion. A missing id used to be swallowed by a guarded
  // `if (VAR)` and the function would silently do nothing; name it instead.
  // After the keep-warm short-circuit: a scheduled ping does no work and
  // must not turn a misconfiguration into a loop of failed executions.
  const missingEnv = [
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_COLLECTION_MOVES',
    'APPWRITE_COLLECTION_MOVE_STATUS_HISTORY',
    'APPWRITE_COLLECTION_NOTIFICATIONS',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[updatemovestatus] missing env: ${missingEnv.join(', ')}`);
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
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { moveId, newStatus, note } = body;
    const authId = req.headers['x-appwrite-user-id'] ?? null;

    if (!authId) return res.json({ error: 'Unauthenticated', fnCode: 'api.unauthorized' }, 401);
    if (!moveId || !newStatus) {
      return res.json({ error: 'moveId and newStatus are required', fnCode: 'generic.badRequest' }, 400);
    }

    // Resolve the caller's verified mover profile.
    const profiles = await databases.listDocuments(DATABASE_ID, MOVER_PROFILES_COLLECTION, [
      Query.equal('userId', authId),
      Query.limit(1),
    ]);
    if (profiles.documents.length === 0) return res.json({ error: 'Not a mover', fnCode: 'mover.notAMover' }, 403);
    const profile = profiles.documents[0];
    if (profile.verificationStatus !== 'verified') {
      return res.json({ error: 'Mover is not verified', fnCode: 'mover.notVerified' }, 403);
    }

    // Get current move + ownership check.
    const move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);
    if (relId(move.moverProfileId) !== profile.$id) {
      return res.json({ error: 'You are not assigned to this move', fnCode: 'move.notAssigned' }, 403);
    }
    const currentStatus = move.status || 'draft';

    // Validate transition.
    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      return res.json(
        {
          error: `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedNext.join(', ')}`,
          fnCode: 'move.invalidTransition',
          fnParams: { from: currentStatus, to: newStatus },
        },
        400,
      );
    }

    // Update move status (+ timestamps). Payment rows are owned by the
    // processpayment function — not created here.
    const updates = { status: newStatus };
    const nowIso = new Date().toISOString();
    if (newStatus === 'completed') updates.completedAt = nowIso;
    if (newStatus === 'paid') updates.paidAt = nowIso;
    // Leaving `mover_accepted` means the mover has pressed Start Route (or the
    // job has gone away): either way this move is no longer QUEUED behind
    // another, so its client's ETA panel must stop apologising. Folded into the
    // same write as the status so the client's realtime subscription — which
    // fires on this row — can never see the two disagree.
    if (currentStatus === 'mover_accepted') updates.moverQueuedBehind = false;

    await databases.updateDocument(DATABASE_ID, MOVES_COLLECTION, moveId, updates);

    // ...and restate the flag on the mover's OTHER waiting jobs, which this
    // transition may have just freed (or just blocked). Fail-open by contract.
    await syncQueuedBehind(databases, profile.$id, { moveId, newStatus }, log, error);

    // Status history (changedBy is the authenticated caller, not body-supplied).
    await databases.createDocument(DATABASE_ID, MOVE_STATUS_HISTORY_COLLECTION, ID.unique(), {
      moveId,
      fromStatus: currentStatus,
      toStatus: newStatus,
      changedBy: authId,
      changedAt: nowIso,
      note: note || null,
    },
    // Server-only audit trail — no client in any app reads this collection.
    []);

    // Notify the client. Every transition the client cares about now maps to a
    // pushable type — the granular steps used to fall through to `system`
    // (silent), so a client got nothing for loading / in_transit /
    // arrived_destination / unloading.
    //
    // `notifications.type` is an ENUM. Until the four new values are added to
    // it, writing them would throw and the client would lose the in-app row as
    // well as the push — strictly worse than silence. So: attempt the precise
    // type, and on rejection fall back to `system`, which is always valid. That
    // makes this self-healing — the moment the enum is widened these start
    // pushing with no redeploy. See PROGRESS.md for the operator step.
    const notif = NOTIFICATION_MESSAGES[newStatus];
    if (notif && NOTIFICATIONS_COLLECTION) {
      const clientId = relId(move.clientId);
      if (clientId) {
        const row = {
          userId: clientId,
          title: notif.title,
          body: notif.body,
          data: JSON.stringify({
            moveId,
            handle: move.handle,
            status: newStatus,
            i18nKey: notif.key,
            i18nParams: { handle: move.handle ?? '' },
          }),
          isRead: false,
        };
        const preferredType = STATUS_PUSH_TYPE[newStatus] ?? 'system';
        // notifications.userId IS the addressee's auth account id. `update` is
        // required — markAsRead / markAllAsRead flip isRead from the client
        // session.
        const notifPermissions = [
          Permission.read(Role.user(clientId)),
          Permission.update(Role.user(clientId)),
          Permission.delete(Role.user(clientId)),
        ];
        try {
          await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), {
            ...row,
            type: preferredType,
          }, notifPermissions);
        } catch (e) {
          if (preferredType === 'system') {
            error(`notification failed: ${e.message}`);
          } else {
            error(
              `notification type '${preferredType}' rejected (enum not widened yet): ${e.message} — retrying as system`,
            );
            await databases
              .createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), {
                ...row,
                type: 'system',
              }, notifPermissions)
              .catch((e2) => error(`notification fallback failed: ${e2.message}`));
          }
        }
      }
    }

    log(`Move ${moveId}: ${currentStatus} → ${newStatus} by ${authId}`);
    return res.json({ success: true, previousStatus: currentStatus, newStatus });
  } catch (err) {
    error(`Update move status failed: ${err.message}`);
    return res.json({ error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
