import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const REVIEWS_COLLECTION = process.env.APPWRITE_COLLECTION_REVIEWS;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;

const MAX_COMMENT_LENGTH = 1000;

/** Relationship attributes arrive as either a bare id or a hydrated doc. */
const relId = (v) => (typeof v === 'string' ? v : v?.$id ?? null);

export default async ({ req, res, log, error }) => {
  // Keep-warm ping (scheduled trigger): short-circuit before any work.
  //
  // A review is submitted once per completed move, so this container was
  // always cold — and a cold start plus seven sequential Appwrite round trips
  // ran past the 30 s synchronous ceiling. Production executions were failing
  // with "Synchronous function execution timed out", which is what the app
  // surfaced as "couldn't submit your review". Pair this with the schedule in
  // appwrite.config.json; the short-circuit alone does nothing.
  if (req.headers['x-appwrite-trigger'] === 'schedule') {
    return res.json({ warm: true });
  }

  // Startup assertion. A missing id used to be swallowed by a guarded
  // `if (VAR)` and the function would silently do nothing; name it instead.
  // After the keep-warm short-circuit: a scheduled ping does no work and
  // must not turn a misconfiguration into a loop of failed executions.
  const missingEnv = [
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_COLLECTION_MOVES',
    'APPWRITE_COLLECTION_NOTIFICATIONS',
    'APPWRITE_COLLECTION_REVIEWS',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[submitreview] missing env: ${missingEnv.join(', ')}`);
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
    const { moveId, rating, comment } = body;

    // Identity comes from the platform-injected header, never the body.
    // reviewerId and moverProfileId used to be caller-supplied, which made the
    // duplicate check meaningless (both halves of its key were attacker-
    // controlled) and let anyone inflate their own or wreck a rival's rating.
    const reviewerId = req.headers['x-appwrite-user-id'];
    if (!reviewerId) {
      return res.json({ error: 'Authentication required' }, 401);
    }

    if (!moveId || rating === undefined || rating === null) {
      return res.json({ error: 'moveId and rating are required' }, 400);
    }

    // Coerce before comparing. A string "5" passed the old numeric range check
    // and then made the average concatenate instead of add, permanently
    // poisoning mover_profiles.rating with NaN.
    const ratingValue = Number(rating);
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.json({ error: 'Rating must be an integer between 1 and 5' }, 400);
    }

    if (comment != null && typeof comment !== 'string') {
      return res.json({ error: 'Comment must be a string' }, 400);
    }
    const commentValue = comment ? String(comment).slice(0, MAX_COMMENT_LENGTH) : null;

    // The move decides who may review it and who is being reviewed. This
    // collection is a new dependency of this function — without the variable
    // every getDocument below would throw and every reviewer would be told
    // "Move not found", so fail loudly on the misconfiguration instead.
    if (!MOVES_COLLECTION) {
      error('submitreview: APPWRITE_COLLECTION_MOVES is not set');
      return res.json({ error: 'Reviews are temporarily unavailable' }, 500);
    }

    // The move fetch and the duplicate check are independent — both are keyed
    // only on values we already have — so overlap them. Every Appwrite Cloud
    // round trip costs a few hundred ms and this handler is a tap the user
    // watches a spinner on.
    const [moveResult, existingResult] = await Promise.allSettled([
      databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId),
      databases.listDocuments(DATABASE_ID, REVIEWS_COLLECTION, [
        Query.equal('moveId', moveId),
        Query.equal('reviewerId', reviewerId),
        Query.limit(1),
      ]),
    ]);

    if (moveResult.status === 'rejected') {
      return res.json({ error: 'Move not found' }, 404);
    }
    const move = moveResult.value;

    // A failed duplicate check must not pass silently — the unique-ish guard is
    // the only thing stopping one client stacking reviews on a mover.
    if (existingResult.status === 'rejected') {
      error(`submitreview: duplicate check failed: ${existingResult.reason?.message}`);
      return res.json({ error: 'Could not submit your review. Please try again.' }, 500);
    }

    if (relId(move.clientId) !== reviewerId) {
      return res.json({ error: 'Only the move\'s client may review it' }, 403);
    }

    if (move.status !== 'completed') {
      return res.json({ error: 'You can only review a completed move' }, 400);
    }

    const moverProfileId = relId(move.moverProfileId);
    if (!moverProfileId) {
      return res.json({ error: 'This move has no assigned mover to review' }, 400);
    }

    if (existingResult.value.documents.length > 0) {
      return res.json({ error: 'You have already reviewed this move' }, 400);
    }

    // Read the mover's existing reviews and their profile together. The profile
    // read is what turns moverProfileId — which is NOT an auth account id —
    // into the mover's Role.user(...), via the userId relationship; the review
    // row cannot be written until that is known, so it no longer shares the
    // Promise.all.
    const [priorReviews, reviewedProfile] = await Promise.all([
      databases.listDocuments(DATABASE_ID, REVIEWS_COLLECTION, [
        Query.equal('moverProfileId', moverProfileId),
        Query.limit(1000),
      ]),
      databases.getDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, moverProfileId),
    ]);
    const reviewedMoverUserId = relId(reviewedProfile.userId);

    // The duplicate check above already proved this review isn't in the table
    // yet, so the new rating can be folded into the tally locally rather than
    // re-reading the collection after the write.
    const reviewPermissions = [Permission.read(Role.user(reviewerId))];
    if (reviewedMoverUserId) {
      reviewPermissions.push(Permission.read(Role.user(reviewedMoverUserId)));
    }
    const review = await databases.createDocument(
      DATABASE_ID,
      REVIEWS_COLLECTION,
      ID.unique(),
      {
        moveId,
        reviewerId,
        moverProfileId,
        rating: ratingValue,
        comment: commentValue,
      },
      // The public star rating comes from the aggregate mover_profiles.rating,
      // so only the two parties need to read the row itself.
      reviewPermissions,
    );

    // The list may or may not already include the row we just created,
    // depending on which request landed first — exclude it by id and add the
    // known rating back so the average is right either way.
    const prior = priorReviews.documents.filter((r) => r.$id !== review.$id);
    // Number() guards against any legacy string ratings already in the table.
    const totalRating =
      prior.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) + ratingValue;
    const avgRating = Math.round((totalRating / (prior.length + 1)) * 10) / 10;

    // updateDocument returns the updated document, so this doubles as the
    // profile read the notification below needs — one round trip, not two.
    const moverProfile = await databases.updateDocument(
      DATABASE_ID,
      MOVER_PROFILES_COLLECTION,
      moverProfileId,
      { rating: avgRating }
    );

    // Notify mover. Best-effort: the review is saved and the rating is updated,
    // and neither should be undone because a notification row failed to write.
    try {
      const moverUserId = relId(moverProfile.userId);
      if (moverUserId) {
        await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), {
          userId: moverUserId,
          type: 'review',
          title: 'New Review',
          body: `You received a ${ratingValue}-star review${commentValue ? `: "${commentValue.substring(0, 100)}"` : '.'}`,
          data: JSON.stringify({ reviewId: review.$id, moveId, rating: ratingValue }),
          isRead: false,
        }, [
          // Addressee only. `update` is needed for markAsRead / markAllAsRead.
          Permission.read(Role.user(moverUserId)),
          Permission.update(Role.user(moverUserId)),
          Permission.delete(Role.user(moverUserId)),
        ]);
      }
    } catch (e) {
      error(`submitreview: mover notification failed: ${e.message}`);
    }

    log(`Review submitted for mover ${moverProfileId}: ${ratingValue} stars`);

    return res.json({ success: true, review, newAverageRating: avgRating });
  } catch (err) {
    error(`Submit review failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
