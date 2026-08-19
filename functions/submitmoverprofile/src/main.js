import { Client, Databases, ID, Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const USERS_COLLECTION = process.env.APPWRITE_COLLECTION_USERS;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;

const PLATFORM_CONFIG_COLLECTION =
  process.env.APPWRITE_COLLECTION_PLATFORM_CONFIG || 'platform_config';

// ── T9: country mapping + sanctions gate ─────────────────────────────────────
// `primaryCountry` is free text; map the common spellings to ISO2. Mirrored in
// writetaxledger — keep in sync. Unknown countries map to null (never blocked:
// a typo must not lock a mover out; DAC7 KYC review catches residence later).
const COUNTRY_CODES = {
  germany: 'DE', deutschland: 'DE', de: 'DE',
  austria: 'AT', 'österreich': 'AT', osterreich: 'AT', at: 'AT',
  switzerland: 'CH', schweiz: 'CH', suisse: 'CH', ch: 'CH',
  france: 'FR', fr: 'FR', netherlands: 'NL', nederland: 'NL', nl: 'NL',
  belgium: 'BE', be: 'BE', poland: 'PL', polska: 'PL', pl: 'PL',
  'united kingdom': 'GB', uk: 'GB', gb: 'GB',
  'united states': 'US', usa: 'US', us: 'US',
  ghana: 'GH', gh: 'GH',
  russia: 'RU', ru: 'RU', belarus: 'BY', by: 'BY',
  iran: 'IR', ir: 'IR', syria: 'SY', sy: 'SY',
  'north korea': 'KP', kp: 'KP', cuba: 'CU', cu: 'CU',
};

export function countryToIso2(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase();
  if (COUNTRY_CODES[key]) return COUNTRY_CODES[key];
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();
  return null;
}

/**
 * Operator-managed deny list (platform_config `sanctioned_countries`, JSON
 * array of ISO2). Data, not code: sanctions policy changes are a config edit.
 */
export function isSanctionedCountry(primaryCountry, sanctionedList) {
  const code = countryToIso2(primaryCountry);
  if (!code) return false;
  return Array.isArray(sanctionedList) && sanctionedList.includes(code);
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
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
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
      vatId,
      businessStreet,
      businessPostcode,
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
    } = body;

    // T9 sanctions gate — server-authoritative; both onboarding UIs surface
    // this message verbatim.
    try {
      const cfg = await databases.listDocuments(DATABASE_ID, PLATFORM_CONFIG_COLLECTION, [
        Query.equal('key', 'sanctioned_countries'),
        Query.limit(1),
      ]);
      const list = cfg.documents[0]?.value ? JSON.parse(cfg.documents[0].value) : [];
      if (isSanctionedCountry(primaryCountry, list)) {
        return res.json(
          { error: `PickLT does not operate in ${primaryCountry}. Mover onboarding is not available there.` },
          403,
        );
      }
    } catch (e) {
      // Config unavailable → do not block onboarding on infrastructure noise.
      error(`sanctions config check failed (continuing): ${e.message}`);
    }

    // Profile fields written on both create and re-submit. A re-submit returns
    // the mover to pending_verification (vehicle/KYC changes need re-review).
    const profileFields = {
      userId,
      driversLicense: driversLicense || null,
      driversLicensePhoto: driversLicensePhoto || null,
      socialSecurityNumber: socialSecurityNumber || null,
      taxNumber: taxNumber || null,
      vatId: vatId || null,
      businessStreet: businessStreet || null,
      businessPostcode: businessPostcode || null,
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
