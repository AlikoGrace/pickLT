import { Client, Databases, ID, Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const MOVE_REQUESTS_COLLECTION = process.env.APPWRITE_COLLECTION_MOVE_REQUESTS;

const MAX_MOVERS = 10;
const REQUEST_TIMEOUT_SECONDS = 60;

// Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    const { moveId } = body;

    if (!moveId) {
      return res.json({ error: 'moveId is required' }, 400);
    }

    // Get move details
    const move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);

    if (!move.pickupLatitude || !move.pickupLongitude) {
      return res.json({ error: 'Move has no pickup coordinates' }, 400);
    }

    // Fetch online, verified movers
    const movers = await databases.listDocuments(
      DATABASE_ID,
      MOVER_PROFILES_COLLECTION,
      [
        Query.equal('verificationStatus', 'verified'),
        Query.equal('isOnline', true),
        Query.limit(100),
      ]
    );

    // Calculate distances and sort by proximity
    const nearbyMovers = movers.documents
      .filter(m => m.currentLatitude && m.currentLongitude)
      .map(m => ({
        ...m,
        distanceKm: haversineKm(
          move.pickupLatitude, move.pickupLongitude,
          m.currentLatitude, m.currentLongitude
        ),
      }))
      .filter(m => m.distanceKm <= 15)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, MAX_MOVERS);

    if (nearbyMovers.length === 0) {
      log(`No nearby movers found for move ${moveId}`);
      return res.json({ success: true, requestsSent: 0, message: 'No nearby movers available' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + REQUEST_TIMEOUT_SECONDS * 1000).toISOString();

    // Create move requests for each nearby mover
    const requests = [];
    for (const mover of nearbyMovers) {
      const request = await databases.createDocument(
        DATABASE_ID,
        MOVE_REQUESTS_COLLECTION,
        ID.unique(),
        {
          moveId,
          moverProfileId: mover.$id,
          status: 'pending',
          sentAt: now.toISOString(),
          respondedAt: null,
          expiresAt,
        }
      );
      requests.push(request);
    }

    log(`Broadcast ${requests.length} move requests for move ${moveId}`);

    return res.json({
      success: true,
      requestsSent: requests.length,
      moversNotified: nearbyMovers.map(m => ({ id: m.$id, distanceKm: Math.round(m.distanceKm * 10) / 10 })),
    });
  } catch (err) {
    error(`Broadcast move request failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
