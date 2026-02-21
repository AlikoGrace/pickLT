import { Client, Databases, ID } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const USERS_COLLECTION = process.env.APPWRITE_COLLECTION_USERS;
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
    const {
      userId,
      fullName,
      phone,
      driversLicense,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehicleCapacity,
      vehicleRegistration,
      vehicleType,
      languages,
      yearsExperience,
      baseRate,
    } = body;

    if (!userId) {
      return res.json({ error: 'userId is required' }, 400);
    }

    // Create mover profile
    const profile = await databases.createDocument(
      DATABASE_ID,
      MOVER_PROFILES_COLLECTION,
      ID.unique(),
      {
        userId,
        driversLicense: driversLicense || null,
        vehicleBrand: vehicleBrand || null,
        vehicleModel: vehicleModel || null,
        vehicleYear: vehicleYear || null,
        vehicleCapacity: vehicleCapacity || null,
        vehicleRegistration: vehicleRegistration || null,
        vehicleType: vehicleType || null,
        languages: languages || [],
        yearsExperience: yearsExperience || 0,
        baseRate: baseRate || 0,
        rating: 0,
        totalMoves: 0,
        verificationStatus: 'pending_verification',
        isOnline: false,
        currentLatitude: null,
        currentLongitude: null,
      }
    );

    // Build user updates — always set userType, optionally include personal info
    const userUpdates = { userType: 'mover' };
    if (fullName) userUpdates.fullName = fullName;
    if (phone) userUpdates.phone = phone.startsWith('+') ? phone : `+${phone}`;

    await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, userId, userUpdates);

    // Notify user about pending verification
    await databases.createDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION,
      ID.unique(),
      {
        userId,
        type: 'system',
        title: 'Profile Submitted',
        body: 'Your mover profile is under review. We will notify you once it is verified.',
        data: JSON.stringify({ moverProfileId: profile.$id }),
        isRead: false,
      }
    );

    log(`Mover profile created: ${profile.$id} for user ${userId}`);

    return res.json({ success: true, profile });
  } catch (err) {
    error(`Submit mover profile failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
