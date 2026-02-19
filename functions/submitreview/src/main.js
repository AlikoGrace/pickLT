import { Client, Databases, ID, Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const REVIEWS_COLLECTION = process.env.APPWRITE_COLLECTION_REVIEWS;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;

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
    const { moveId, reviewerId, moverProfileId, rating, comment } = body;

    if (!moveId || !reviewerId || !moverProfileId || !rating) {
      return res.json({ error: 'moveId, reviewerId, moverProfileId, and rating are required' }, 400);
    }

    if (rating < 1 || rating > 5) {
      return res.json({ error: 'Rating must be between 1 and 5' }, 400);
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
        rating,
        comment: comment || null,
      }
    );

    // Recalculate mover's average rating
    const allReviews = await databases.listDocuments(
      DATABASE_ID,
      REVIEWS_COLLECTION,
      [Query.equal('moverProfileId', moverProfileId), Query.limit(1000)]
    );

    const totalRating = allReviews.documents.reduce((sum, r) => sum + (r.rating || 0), 0);
    const avgRating = Math.round((totalRating / allReviews.documents.length) * 10) / 10;

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
