import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const MOVER_LOCATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_LOCATIONS;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;

// Relationship attributes deserialize as a bare id OR a hydrated object.
const relId = (v) => (!v ? null : typeof v === 'string' ? v : v.$id ?? null);

/**
 * Statuses in which a client is tracking this mover, in progression order.
 * Mirrors the mover app's ACTIVE_STATUSES (hooks/use-active-move.ts). The
 * row's `moveId` tag goes to the most advanced live move; every live move's
 * client gets read access.
 */
const TRACKED_STATUSES = [
  'mover_accepted',
  'mover_en_route',
  'mover_arrived',
  'loading',
  'in_transit',
  'arrived_destination',
  'unloading',
  'awaiting_payment',
  'paid',
];
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

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
 *
 * The row's `moveId` tag and its reader list are derived server-side from the
 * moves this mover is assigned to (see below), so a ping is correct from any
 * screen, foreground or background.
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
    return res.json({ error: 'misconfigured', fnCode: 'generic.misconfigured' }, 500);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const databases = new Databases(client);

  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed', fnCode: 'generic.methodNotAllowed' }, 405);
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { moveId, latitude, longitude, heading, speed } = body;
    const authId = req.headers['x-appwrite-user-id'] ?? null;

    if (!authId) return res.json({ error: 'Unauthenticated', fnCode: 'api.unauthorized' }, 401);
    if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
      return res.json({ error: 'latitude and longitude are required', fnCode: 'generic.badRequest' }, 400);
    }
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return res.json({ error: 'latitude/longitude out of range', fnCode: 'generic.badRequest' }, 400);
    }

    // Resolve the caller's own profile — never trust a body-supplied id.
    const profiles = await databases.listDocuments(DATABASE_ID, MOVER_PROFILES_COLLECTION, [
      Query.equal('userId', authId),
      Query.limit(1),
    ]);
    if (profiles.documents.length === 0) return res.json({ error: 'Not a mover', fnCode: 'mover.notAMover' }, 403);
    const moverProfileId = profiles.documents[0].$id;

    // Which move does this ping belong to, and who may read it? Decided here,
    // from the moves this mover is actually assigned to — never from the
    // client. The mover app streams from every screen, foreground and
    // background (field test 2026-08-25), so it cannot know which of its
    // screens "owns" the row; and a body-supplied moveId used to let any
    // mover grant themselves a stranger's client as a reader and repaint that
    // client's truck marker.
    //
    // ONE row per mover, upserted in place, and Appwrite REPLACES the
    // permission array on every write — so the full set is recomputed each
    // ping. authId is the mover's auth account id; mover_profiles.$id is not.
    let liveMoves = [];
    try {
      const r = await databases.listDocuments(DATABASE_ID, MOVES_COLLECTION, [
        Query.equal('moverProfileId', moverProfileId),
        Query.equal('status', TRACKED_STATUSES),
        Query.limit(10),
      ]);
      liveMoves = r.documents;
    } catch (lookupErr) {
      // Never fail a position ping over the lookup — the mover keeps their
      // own read and the profile mirror below still feeds discovery.
      error(`updatemoverlocation: live-move lookup failed: ${lookupErr.message}`);
    }

    // Tag: the caller's stated move if it is one of theirs (screen intent),
    // else the most advanced live move, else none.
    const rank = (m) => TRACKED_STATUSES.indexOf(m.status);
    const stated = moveId ? liveMoves.find((m) => m.$id === moveId) : null;
    const tagged =
      stated ?? [...liveMoves].sort((a, b) => rank(b) - rank(a))[0] ?? null;

    const payload = {
      moverProfileId,
      moveId: tagged ? tagged.$id : null,
      latitude,
      longitude,
      heading: heading ?? null,
      speed: speed ?? null,
      timestamp: new Date().toISOString(),
    };

    const readers = new Set([authId]);
    for (const m of liveMoves) {
      const clientAuthId = relId(m.clientId);
      if (clientAuthId) readers.add(clientAuthId);
    }
    const locationPermissions = [...readers].map((id) => Permission.read(Role.user(id)));

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
    return res.json({ error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
