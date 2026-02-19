import { Client, Databases, ID } from 'node-appwrite';

const DATABASE_ID = '6990885c000627570048';
const MOVES_COLLECTION = '6991e46d001ab2a9f7d8';
const MOVE_STATUS_HISTORY_COLLECTION = '69920520001652c21df7';
const NOTIFICATIONS_COLLECTION = '69950bed001ecf9203b3';

// Valid status transitions
const VALID_TRANSITIONS = {
  draft: ['pending_payment', 'cancelled_by_client'],
  pending_payment: ['paid', 'cancelled_by_client'],
  paid: ['mover_assigned', 'cancelled_by_client'],
  mover_assigned: ['mover_accepted', 'cancelled_by_mover'],
  mover_accepted: ['mover_en_route', 'cancelled_by_mover', 'cancelled_by_client'],
  mover_en_route: ['mover_arrived', 'cancelled_by_mover'],
  mover_arrived: ['loading'],
  loading: ['in_transit'],
  in_transit: ['arrived_destination'],
  arrived_destination: ['unloading'],
  unloading: ['completed'],
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
  completed: { title: 'Move Completed', body: 'Your move has been completed! Please leave a review.' },
  cancelled_by_mover: { title: 'Move Cancelled', body: 'The mover has cancelled this move.' },
};

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
    const { moveId, newStatus, changedBy, note } = body;

    if (!moveId || !newStatus || !changedBy) {
      return res.json({ error: 'moveId, newStatus, and changedBy are required' }, 400);
    }

    // Get current move
    const move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);
    const currentStatus = move.status || 'draft';

    // Validate transition
    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      return res.json({
        error: `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedNext.join(', ')}`,
      }, 400);
    }

    // Update move status
    const updates = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completedAt = new Date().toISOString();
    }
    if (newStatus === 'paid') {
      updates.paidAt = new Date().toISOString();
    }

    await databases.updateDocument(DATABASE_ID, MOVES_COLLECTION, moveId, updates);

    // Create status history entry
    await databases.createDocument(
      DATABASE_ID,
      MOVE_STATUS_HISTORY_COLLECTION,
      ID.unique(),
      {
        moveId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        changedBy,
        changedAt: new Date().toISOString(),
        note: note || null,
      }
    );

    // Send notification to client
    const notif = NOTIFICATION_MESSAGES[newStatus];
    if (notif) {
      const clientId = typeof move.clientId === 'string' ? move.clientId : move.clientId.$id;
      await databases.createDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION,
        ID.unique(),
        {
          userId: clientId,
          type: newStatus === 'completed' ? 'move_completed' : 'system',
          title: notif.title,
          body: notif.body,
          data: JSON.stringify({ moveId, status: newStatus }),
          isRead: false,
        }
      );
    }

    log(`Move ${moveId}: ${currentStatus} → ${newStatus} by ${changedBy}`);

    return res.json({ success: true, previousStatus: currentStatus, newStatus });
  } catch (err) {
    error(`Update move status failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
