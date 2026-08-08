import { Client, Databases, ID, Query } from 'node-appwrite';

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

const NOTIFICATION_MESSAGES = {
  mover_accepted: { title: 'Mover Accepted', body: 'A mover has accepted your move request!' },
  mover_en_route: { title: 'Mover En Route', body: 'Your mover is on the way to your pickup location.' },
  mover_arrived: { title: 'Mover Arrived', body: 'Your mover has arrived at the pickup location.' },
  loading: { title: 'Loading Started', body: 'Your items are being loaded.' },
  in_transit: { title: 'In Transit', body: 'Your items are on the way to the destination.' },
  arrived_destination: { title: 'Arrived', body: 'Your mover has arrived at the destination.' },
  unloading: { title: 'Unloading', body: 'Your items are being unloaded.' },
  awaiting_payment: { title: 'Payment Due', body: 'Your move is done — please confirm payment.' },
  completed: { title: 'Move Completed', body: 'Your move has been completed! Please leave a review.' },
  cancelled_by_mover: { title: 'Move Cancelled', body: 'The mover has cancelled this move.' },
};

function relId(v) {
  if (!v) return null;
  return typeof v === 'string' ? v : (v.$id ?? null);
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

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const databases = new Databases(client);

  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { moveId, newStatus, note } = body;
    const authId = req.headers['x-appwrite-user-id'] ?? null;

    if (!authId) return res.json({ error: 'Unauthenticated' }, 401);
    if (!moveId || !newStatus) {
      return res.json({ error: 'moveId and newStatus are required' }, 400);
    }

    // Resolve the caller's verified mover profile.
    const profiles = await databases.listDocuments(DATABASE_ID, MOVER_PROFILES_COLLECTION, [
      Query.equal('userId', authId),
      Query.limit(1),
    ]);
    if (profiles.documents.length === 0) return res.json({ error: 'Not a mover' }, 403);
    const profile = profiles.documents[0];
    if (profile.verificationStatus !== 'verified') {
      return res.json({ error: 'Mover is not verified' }, 403);
    }

    // Get current move + ownership check.
    const move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);
    if (relId(move.moverProfileId) !== profile.$id) {
      return res.json({ error: 'You are not assigned to this move' }, 403);
    }
    const currentStatus = move.status || 'draft';

    // Validate transition.
    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      return res.json(
        {
          error: `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedNext.join(', ')}`,
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

    await databases.updateDocument(DATABASE_ID, MOVES_COLLECTION, moveId, updates);

    // Status history (changedBy is the authenticated caller, not body-supplied).
    await databases.createDocument(DATABASE_ID, MOVE_STATUS_HISTORY_COLLECTION, ID.unique(), {
      moveId,
      fromStatus: currentStatus,
      toStatus: newStatus,
      changedBy: authId,
      changedAt: nowIso,
      note: note || null,
    });

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
          data: JSON.stringify({ moveId, handle: move.handle, status: newStatus }),
          isRead: false,
        };
        const preferredType = STATUS_PUSH_TYPE[newStatus] ?? 'system';
        try {
          await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), {
            ...row,
            type: preferredType,
          });
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
              })
              .catch((e2) => error(`notification fallback failed: ${e2.message}`));
          }
        }
      }
    }

    log(`Move ${moveId}: ${currentStatus} → ${newStatus} by ${authId}`);
    return res.json({ success: true, previousStatus: currentStatus, newStatus });
  } catch (err) {
    error(`Update move status failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
