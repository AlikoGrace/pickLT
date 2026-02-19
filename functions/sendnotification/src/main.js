import { Client, Databases, ID } from 'node-appwrite';

const DATABASE_ID = '6990885c000627570048';
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
    const { userId, type, title, body: notifBody, data } = body;

    if (!userId || !title) {
      return res.json({ error: 'userId and title are required' }, 400);
    }

    const notification = await databases.createDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION,
      ID.unique(),
      {
        userId,
        type: type || 'system',
        title,
        body: notifBody || '',
        data: typeof data === 'object' ? JSON.stringify(data) : (data || null),
        isRead: false,
      }
    );

    log(`Notification sent to ${userId}: ${title}`);

    return res.json({ success: true, notification });
  } catch (err) {
    error(`Send notification failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
