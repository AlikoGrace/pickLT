import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;

const VALID_STATUSES = ['verified', 'rejected', 'suspended'];

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
    return res.json({ error: 'misconfigured' }, 500);
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
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      return res.json({ error: 'Invalid JSON body' }, 400);
    }
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
        // `verification` is in sendpush's PUSHABLE_TYPES and in the live
        // notifications.type enum; `system` is in neither, so setting it here
        // silently dropped the push telling a mover they had been verified,
        // rejected or suspended — the one notification that decides whether
        // they can accept work at all.
        type: 'verification',
        title: `Profile ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        body: statusMessages[newStatus],
        data: JSON.stringify({ moverProfileId, newStatus }),
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

    log(`Mover ${moverProfileId} status updated to ${newStatus} by admin ${adminId}`);

    return res.json({ success: true, profile });
  } catch (err) {
    error(`Admin verify mover failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
