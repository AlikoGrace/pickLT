import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const MOVER_LOCATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_LOCATIONS;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;

// Relationship attributes deserialize as a bare id OR a hydrated object.
const relId = (v) => (!v ? null : typeof v === 'string' ? v : v.$id ?? null);

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

  // Startup assertion. A missing id used to be swallowed by a guarded
  // `if (VAR)` and the function would silently do nothing; name it instead.
  // After the keep-warm short-circuit: a scheduled ping does no work and
  // must not turn a misconfiguration into a loop of failed executions.
  const missingEnv = [
    'APPWRITE_COLLECTION_MOVER_LOCATIONS',
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_COLLECTION_MOVES',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[updatemoverlocation] missing env: ${missingEnv.join(', ')}`);
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

    // Live GPS. The mover always reads their own row; the client of the move
    // this ping is attached to reads it only while that move is live. There is
    // ONE row per mover which is upserted in place, so the permission set has
    // to be re-emitted on every write — Appwrite REPLACES the array, and a row
    // first written while the mover was idle would otherwise stay
    // mover-only-readable for the whole of their next job. Dropping moveId
    // (idle heartbeat) likewise revokes the previous client's read.
    //
    // authId is the mover's Appwrite auth account id — mover_profiles.$id is
    // not, so it must never be used here.
    const locationPermissions = [Permission.read(Role.user(authId))];
    if (moveId && MOVES_COLLECTION) {
      try {
        const move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);
        const clientAuthId = relId(move.clientId);
        if (clientAuthId && clientAuthId !== authId) {
          locationPermissions.push(Permission.read(Role.user(clientAuthId)));
        }
      } catch (lookupErr) {
        // Never fail a position ping over the lookup — the mover keeps their
        // own read and the client falls back to mover_profiles coordinates.
        error(`updatemoverlocation: move lookup failed for ${moveId}: ${lookupErr.message}`);
      }
    }

    // Upsert this mover's single location row.
    const existing = await databases.listDocuments(DATABASE_ID, MOVER_LOCATIONS_COLLECTION, [
      Query.equal('moverProfileId', moverProfileId),
      Query.limit(1),
    ]);
    let rowId = existing.documents[0]?.$id ?? null;

    if (rowId) {
      await databases.updateDocument(
        DATABASE_ID,
        MOVER_LOCATIONS_COLLECTION,
        rowId,
        payload,
        locationPermissions,
      );
    } else {
      try {
        const created = await databases.createDocument(
          DATABASE_ID,
          MOVER_LOCATIONS_COLLECTION,
          ID.unique(),
          payload,
          locationPermissions,
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
        await databases.updateDocument(
          DATABASE_ID,
          MOVER_LOCATIONS_COLLECTION,
          rowId,
          payload,
          locationPermissions,
        );
      }
    }

    // Mirror the position onto the profile — the client seeds its marker from
    // here before the first realtime event lands. `locationUpdatedAt` is the
    // freshness stamp discovery filters on (T2: a killed app leaves isOnline
    // stuck true with frozen coords; staleness is how ghosts are excluded).
    await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, moverProfileId, {
      currentLatitude: latitude,
      currentLongitude: longitude,
      locationUpdatedAt: payload.timestamp,
    });

    return res.json({ success: true, locationId: rowId });
  } catch (err) {
    error(`Update mover location failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
