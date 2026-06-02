import { Client, Databases, ID, Query } from 'node-appwrite';

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
    const { moveId, latitude, longitude, heading, speed } = body;
    const authId = req.headers['x-appwrite-user-id'] ?? null;

    if (!authId) return res.json({ error: 'Unauthenticated' }, 401);
    if (latitude == null || longitude == null) {
      return res.json({ error: 'latitude and longitude are required' }, 400);
    }

    // Resolve the caller's own profile — never trust a body-supplied id.
    const profiles = await databases.listDocuments(DATABASE_ID, MOVER_PROFILES_COLLECTION, [
      Query.equal('userId', authId),
      Query.limit(1),
    ]);
    if (profiles.documents.length === 0) return res.json({ error: 'Not a mover' }, 403);
    const moverProfileId = profiles.documents[0].$id;

    const now = new Date().toISOString();

    // Write location record (Appwrite Realtime broadcasts this).
    await databases.createDocument(DATABASE_ID, MOVER_LOCATIONS_COLLECTION, ID.unique(), {
      moverProfileId,
      moveId: moveId || null,
      latitude,
      longitude,
      heading: heading ?? null,
      speed: speed ?? null,
      timestamp: now,
    });

    // Update the mover's current position on their profile.
    await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, moverProfileId, {
      currentLatitude: latitude,
      currentLongitude: longitude,
    });

    return res.json({ success: true });
  } catch (err) {
    error(`Update mover location failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
