import { Client, Databases, ID, Query } from 'node-appwrite';

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
    // Identity comes from the authenticated session, never the body.
    const userId = req.headers['x-appwrite-user-id'] ?? null;
    if (!userId) return res.json({ error: 'Unauthenticated' }, 401);

    const {
      fullName,
      phone,
      driversLicense,
      driversLicensePhoto,
      selfiePhoto,
      socialSecurityNumber,
      taxNumber,
      primaryCity,
      primaryCountry,
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

    // Profile fields written on both create and re-submit. A re-submit returns
    // the mover to pending_verification (vehicle/KYC changes need re-review).
    const profileFields = {
      userId,
      driversLicense: driversLicense || null,
      driversLicensePhoto: driversLicensePhoto || null,
      socialSecurityNumber: socialSecurityNumber || null,
      taxNumber: taxNumber || null,
      primaryCity: primaryCity || null,
      primaryCountry: primaryCountry || null,
      vehicleBrand: vehicleBrand || null,
      vehicleModel: vehicleModel || null,
      vehicleYear: vehicleYear || null,
      vehicleCapacity: vehicleCapacity || null,
      vehicleRegistration: vehicleRegistration || null,
      vehicleType: vehicleType || null,
      languages: languages || [],
      yearsExperience: yearsExperience || 0,
      baseRate: baseRate || 0,
      verificationStatus: 'pending_verification',
    };

    // Upsert: update the existing profile if one exists, else create.
    const existing = await databases.listDocuments(DATABASE_ID, MOVER_PROFILES_COLLECTION, [
      Query.equal('userId', userId),
      Query.limit(1),
    ]);

    let profile;
    if (existing.documents.length > 0) {
      profile = await databases.updateDocument(
        DATABASE_ID,
        MOVER_PROFILES_COLLECTION,
        existing.documents[0].$id,
        profileFields,
      );
    } else {
      profile = await databases.createDocument(
        DATABASE_ID,
        MOVER_PROFILES_COLLECTION,
        ID.unique(),
        {
          ...profileFields,
          rating: 0,
          totalMoves: 0,
          isOnline: false,
          currentLatitude: null,
          currentLongitude: null,
        },
      );
    }

    // User-doc updates: flip to mover, set name/phone, use the selfie as the
    // profile photo (matches the web onboarding behavior).
    const userUpdates = { userType: 'mover' };
    if (fullName) userUpdates.fullName = fullName;
    if (phone) userUpdates.phone = phone.startsWith('+') ? phone : `+${phone}`;
    if (selfiePhoto) userUpdates.profilePhoto = selfiePhoto;
    await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, userId, userUpdates);

    if (NOTIFICATIONS_COLLECTION) {
      await databases
        .createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), {
          userId,
          type: 'system',
          title: 'Profile Submitted',
          body: 'Your mover profile is under review. We will notify you once it is verified.',
          data: JSON.stringify({ moverProfileId: profile.$id }),
          isRead: false,
        })
        .catch((e) => error(`notification failed: ${e.message}`));
    }

    log(`Mover profile ${existing.documents.length > 0 ? 'updated' : 'created'}: ${profile.$id} for user ${userId}`);
    return res.json({ success: true, profile });
  } catch (err) {
    error(`Submit mover profile failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
