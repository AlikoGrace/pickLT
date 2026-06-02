import { Client, Databases, ID, Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const MOVE_STATUS_HISTORY_COLLECTION = process.env.APPWRITE_COLLECTION_MOVE_STATUS_HISTORY;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;
const PAYMENTS_COLLECTION = process.env.APPWRITE_COLLECTION_PAYMENTS;

// Valid status transitions. Extended for the mover app's cash-payment flow:
// unloading → awaiting_payment → completed (completion itself is driven by the
// confirmpaymentmover dual-handshake, but the transition is permitted here so a
// card-paid move can also go unloading → completed directly).
const VALID_TRANSITIONS = {
  draft: ['pending_payment', 'booked', 'cancelled_by_client'],
  booked: ['paid', 'pending_payment', 'mover_assigned', 'mover_accepted', 'cancelled_by_client'],
  pending_payment: ['paid', 'cancelled_by_client'],
  paid: ['mover_assigned', 'mover_accepted', 'cancelled_by_client'],
  mover_assigned: ['mover_accepted', 'cancelled_by_mover'],
  mover_accepted: ['mover_en_route', 'cancelled_by_mover', 'cancelled_by_client'],
  mover_en_route: ['mover_arrived', 'cancelled_by_mover'],
  mover_arrived: ['loading'],
  loading: ['in_transit'],
  in_transit: ['arrived_destination'],
  arrived_destination: ['unloading'],
  unloading: ['awaiting_payment', 'completed'],
  awaiting_payment: ['completed', 'cancelled_by_client', 'cancelled_by_mover'],
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

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const databases = new Databases(client);

  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = JSON.parse(req.body || '{}');
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

    // Update move status (+ timestamps).
    const updates = { status: newStatus };
    const nowIso = new Date().toISOString();
    if (newStatus === 'completed') updates.completedAt = nowIso;
    if (newStatus === 'paid') updates.paidAt = nowIso;

    // On entering awaiting_payment (cash flow), make sure a pending payment row
    // exists so the dual-handshake (confirmpaymentmover / client confirm) has a
    // record to confirm. Idempotent — skip if one already exists.
    if (newStatus === 'awaiting_payment' && PAYMENTS_COLLECTION) {
      const amount =
        (typeof move.finalPrice === 'number' && move.finalPrice) ||
        (typeof move.estimatedPrice === 'number' && move.estimatedPrice) ||
        0;
      if (move.finalPrice == null && amount) updates.finalPrice = amount;
      const existing = await databases.listDocuments(DATABASE_ID, PAYMENTS_COLLECTION, [
        Query.equal('moveId', moveId),
        Query.limit(1),
      ]);
      if (existing.documents.length === 0) {
        await databases
          .createDocument(DATABASE_ID, PAYMENTS_COLLECTION, ID.unique(), {
            moveId,
            users: relId(move.clientId),
            amount,
            currency: 'EUR',
            status: 'pending',
            paymentMethod: move.paymentMethod || 'cash',
            transactionId: null,
            clientConfirmedAt: null,
            moverConfirmedAt: null,
          })
          .catch((e) => error(`payment row create failed: ${e.message}`));
      }
    }

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

    // Notify the client.
    const notif = NOTIFICATION_MESSAGES[newStatus];
    if (notif && NOTIFICATIONS_COLLECTION) {
      const clientId = relId(move.clientId);
      if (clientId) {
        await databases
          .createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), {
            userId: clientId,
            type: newStatus === 'completed' ? 'move_completed' : 'system',
            title: notif.title,
            body: notif.body,
            data: JSON.stringify({ moveId, handle: move.handle, status: newStatus }),
            isRead: false,
          })
          .catch((e) => error(`notification failed: ${e.message}`));
      }
    }

    log(`Move ${moveId}: ${currentStatus} → ${newStatus} by ${authId}`);
    return res.json({ success: true, previousStatus: currentStatus, newStatus });
  } catch (err) {
    error(`Update move status failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
