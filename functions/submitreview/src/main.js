import { Client, Databases, ID, Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const REVIEWS_COLLECTION = process.env.APPWRITE_COLLECTION_REVIEWS;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;

const MAX_COMMENT_LENGTH = 1000;

/** Relationship attributes arrive as either a bare id or a hydrated doc. */
const relId = (v) => (typeof v === 'string' ? v : v?.$id ?? null);

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

    // The move decides who may review it and who is being reviewed.
    let move;
    try {
      move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);
    } catch {
      return res.json({ error: 'Move not found' }, 404);
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

    // Check if review already exists for this move
    const existing = await databases.listDocuments(
      DATABASE_ID,
      REVIEWS_COLLECTION,
      [Query.equal('moveId', moveId), Query.equal('reviewerId', reviewerId)]
    );

    if (existing.documents.length > 0) {
      return res.json({ error: 'You have already reviewed this move' }, 400);
    }

    // Create review
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
      }
    );

    // Recalculate mover's average rating
    const allReviews = await databases.listDocuments(
      DATABASE_ID,
      REVIEWS_COLLECTION,
      [Query.equal('moverProfileId', moverProfileId), Query.limit(1000)]
    );

    // Number() guards against any legacy string ratings already in the table.
    const totalRating = allReviews.documents.reduce(
      (sum, r) => sum + (Number(r.rating) || 0),
      0
    );
    const avgRating = allReviews.documents.length
      ? Math.round((totalRating / allReviews.documents.length) * 10) / 10
      : 0;

    await databases.updateDocument(
      DATABASE_ID,
      MOVER_PROFILES_COLLECTION,
      moverProfileId,
      { rating: avgRating }
    );

    // Notify mover
    const moverProfile = await databases.getDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, moverProfileId);
    const moverUserId = typeof moverProfile.userId === 'string' ? moverProfile.userId : moverProfile.userId.$id;

    await databases.createDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION,
      ID.unique(),
      {
        userId: moverUserId,
        type: 'review',
        title: 'New Review',
        body: `You received a ${rating}-star review${comment ? `: "${comment.substring(0, 100)}"` : '.'}`,
        data: JSON.stringify({ reviewId: review.$id, moveId, rating }),
        isRead: false,
      }
    );

    log(`Review submitted for mover ${moverProfileId}: ${rating} stars`);

    return res.json({ success: true, review, newAverageRating: avgRating });
  } catch (err) {
    error(`Submit review failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
