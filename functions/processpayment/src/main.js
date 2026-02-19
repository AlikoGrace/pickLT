import { Client, Databases, ID } from 'node-appwrite';

const DATABASE_ID = '6990885c000627570048';
const MOVES_COLLECTION = '6991e46d001ab2a9f7d8';
const PAYMENTS_COLLECTION = '699206ff000605789649';
const MOVE_STATUS_HISTORY_COLLECTION = '69920520001652c21df7';
const NOTIFICATIONS_COLLECTION = '69950bed001ecf9203b3';

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
    const { moveId, clientId, amount, currency, paymentMethod, transactionId } = body;

    if (!moveId || !clientId || !amount) {
      return res.json({ error: 'moveId, clientId, and amount are required' }, 400);
    }

    // Verify move exists and is in pending_payment status
    const move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);
    if (move.status !== 'pending_payment' && move.status !== 'draft') {
      return res.json({ error: `Move is not awaiting payment. Current status: ${move.status}` }, 400);
    }

    // Create payment record
    const payment = await databases.createDocument(
      DATABASE_ID,
      PAYMENTS_COLLECTION,
      ID.unique(),
      {
        moveId,
        users: clientId,
        amount,
        currency: currency || 'EUR',
        status: 'completed',
        paymentMethod: paymentMethod || 'card',
        transactionId: transactionId || `TXN-${Date.now()}`,
      }
    );

    // Update move status to 'paid'
    await databases.updateDocument(DATABASE_ID, MOVES_COLLECTION, moveId, {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });

    // Create status history entry
    await databases.createDocument(
      DATABASE_ID,
      MOVE_STATUS_HISTORY_COLLECTION,
      ID.unique(),
      {
        moveId,
        fromStatus: move.status,
        toStatus: 'paid',
        changedBy: clientId,
        changedAt: new Date().toISOString(),
        note: `Payment of €${amount} received`,
      }
    );

    // Notify client
    await databases.createDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION,
      ID.unique(),
      {
        userId: clientId,
        type: 'payment',
        title: 'Payment Confirmed',
        body: `Your payment of €${amount} has been processed. Your move booking is confirmed!`,
        data: JSON.stringify({ moveId, paymentId: payment.$id, amount }),
        isRead: false,
      }
    );

    log(`Payment processed: €${amount} for move ${moveId} by client ${clientId}`);

    return res.json({ success: true, payment });
  } catch (err) {
    error(`Process payment failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
