import { Client, Databases, ID, Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const MOVER_LOCATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_LOCATIONS;

/**
 * updatemoverlocation
 *
 * Upserts ONE mover_locations row per mover instead of appending a row per ping.
 *
 * Why upsert: `mover_locations.moveId` is a **oneToOne** relationship, so at most
 * one row may reference a given move. Appending meant the first ping of a move
 * succeeded and every later one failed with "Document with the requested ID
 * '<new id>' already exists" — Appwrite interpolates the *new* document id into
 * its uniqueness error, which disguised the constraint violation as an
 * ID.unique() collision. The client consequently never saw the mover move.
 *
 * One row per mover also bounds table growth and turns the client's realtime
 * feed into `*.update` events on a stable document id.
 */
export default async ({ req, res, log, error }) => {
  // Keep-warm ping (scheduled trigger): short-circuit before any work. Position
  // pings land every ~3 s while a job is live; a cold start stalls the client's
  // view of the mover.
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

    const payload = {
      moverProfileId,
      moveId: moveId || null,
      latitude,
      longitude,
      heading: heading ?? null,
      speed: speed ?? null,
      timestamp: new Date().toISOString(),
    };

    // Upsert this mover's single location row.
    const existing = await databases.listDocuments(DATABASE_ID, MOVER_LOCATIONS_COLLECTION, [
      Query.equal('moverProfileId', moverProfileId),
      Query.limit(1),
    ]);
    let rowId = existing.documents[0]?.$id ?? null;

    if (rowId) {
      await databases.updateDocument(DATABASE_ID, MOVER_LOCATIONS_COLLECTION, rowId, payload);
    } else {
      try {
        const created = await databases.createDocument(
          DATABASE_ID,
          MOVER_LOCATIONS_COLLECTION,
          ID.unique(),
          payload,
        );
        rowId = created.$id;
      } catch (createErr) {
        // Two first-pings can race; the oneToOne moveId constraint surfaces that
        // as a 409. Re-read and update whichever row landed first.
        if (createErr.code !== 409) throw createErr;
        const raced = await databases.listDocuments(DATABASE_ID, MOVER_LOCATIONS_COLLECTION, [
          Query.equal('moverProfileId', moverProfileId),
          Query.limit(1),
        ]);
        rowId = raced.documents[0]?.$id ?? null;
        if (!rowId) throw createErr;
        await databases.updateDocument(DATABASE_ID, MOVER_LOCATIONS_COLLECTION, rowId, payload);
      }
    }

    // Mirror the position onto the profile — the client seeds its marker from
    // here before the first realtime event lands.
    await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, moverProfileId, {
      currentLatitude: latitude,
      currentLongitude: longitude,
    });

    return res.json({ success: true, locationId: rowId });
  } catch (err) {
    error(`Update mover location failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
