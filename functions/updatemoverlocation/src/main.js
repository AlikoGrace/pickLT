import { Client, Databases, ID } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const MOVER_LOCATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_LOCATIONS;

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
    const { moverProfileId, moveId, latitude, longitude, heading, speed } = body;

    if (!moverProfileId || !latitude || !longitude) {
      return res.json({ error: 'moverProfileId, latitude, and longitude are required' }, 400);
    }

    const now = new Date().toISOString();

    // Write location record (Appwrite Realtime will broadcast this)
    await databases.createDocument(
      DATABASE_ID,
      MOVER_LOCATIONS_COLLECTION,
      ID.unique(),
      {
        moverProfileId,
        moveId: moveId || null,
        latitude,
        longitude,
        heading: heading || null,
        speed: speed || null,
        timestamp: now,
      }
    );

    // Update mover's current position on their profile
    await databases.updateDocument(
      DATABASE_ID,
      MOVER_PROFILES_COLLECTION,
      moverProfileId,
      {
        currentLatitude: latitude,
        currentLongitude: longitude,
      }
    );

    return res.json({ success: true });
  } catch (err) {
    error(`Update mover location failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
