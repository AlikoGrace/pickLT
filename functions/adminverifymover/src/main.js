import { Client, Databases, ID } from 'node-appwrite';

const DATABASE_ID = '6990885c000627570048';
const MOVER_PROFILES_COLLECTION = '6991dd5b0022477fb75f';
const NOTIFICATIONS_COLLECTION = '69950bed001ecf9203b3';

const VALID_STATUSES = ['verified', 'rejected', 'suspended'];

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
    const { moverProfileId, newStatus, adminId, reason } = body;

    if (!moverProfileId || !newStatus || !adminId) {
      return res.json({ error: 'moverProfileId, newStatus, and adminId are required' }, 400);
    }

    if (!VALID_STATUSES.includes(newStatus)) {
      return res.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, 400);
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
    const statusMessages = {
      verified: 'Congratulations! Your mover profile has been verified. You can now accept moves.',
      rejected: `Your mover profile application has been rejected. ${reason || 'Please contact support for details.'}`,
      suspended: `Your mover account has been suspended. ${reason || 'Please contact support for details.'}`,
    };

    await databases.createDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION,
      ID.unique(),
      {
        userId,
        type: 'system',
        title: `Profile ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        body: statusMessages[newStatus],
        data: JSON.stringify({ moverProfileId, newStatus }),
        isRead: false,
      }
    );

    log(`Mover ${moverProfileId} status updated to ${newStatus} by admin ${adminId}`);

    return res.json({ success: true, profile });
  } catch (err) {
    error(`Admin verify mover failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
