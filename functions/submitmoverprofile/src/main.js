import { Client, Databases, ID } from 'node-appwrite';

const DATABASE_ID = '6990885c000627570048';
const USERS_COLLECTION = '6991d955003932cb853b';
const MOVER_PROFILES_COLLECTION = '6991dd5b0022477fb75f';
const NOTIFICATIONS_COLLECTION = '69950bed001ecf9203b3';

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

    // Update user type to 'mover'
    await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, userId, {
      userType: 'mover',
    });

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
