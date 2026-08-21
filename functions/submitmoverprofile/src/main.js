import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

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
  // Startup assertion. A missing id used to be swallowed by a guarded
  // `if (VAR)` and the function would silently do nothing; name it instead.
  const missingEnv = [
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_COLLECTION_NOTIFICATIONS',
    'APPWRITE_COLLECTION_USERS',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[submitmoverprofile] missing env: ${missingEnv.join(', ')}`);
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
    // Identity comes from the authenticated session, never the body.
    const userId = req.headers['x-appwrite-user-id'] ?? null;
    if (!userId) return res.json({ error: 'Unauthenticated', fnCode: 'api.unauthorized' }, 401);

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
          {
            error: `PickLT does not operate in ${primaryCountry}. Mover onboarding is not available there.`,
            fnCode: 'country.notSupported',
            fnParams: { country: primaryCountry },
          },
          403,
        );
      }
    } catch (e) {
      // Config unavailable → do not block onboarding on infrastructure noise.
      error(`sanctions config check failed (continuing): ${e.message}`);
    }

    // Denormalised display identity. `mover_profiles` is served to clients
    // through the redacting `listnearbymovers` function, and that projection
    // must never traverse the relationship into `users` — a traversal is a
    // permission-checked read of a stranger's email, phone and date of birth.
    // So the mover's public name and photo live on the profile row itself.
    // `updateprofile` keeps them in sync when the mover edits their account.
    // Mirrored in lib/mover-projection.ts.
    let existingUser = null;
    try {
      existingUser = await databases.getDocument(DATABASE_ID, USERS_COLLECTION, userId);
    } catch (e) {
      error(`could not read user ${userId} for denormalisation: ${e.message}`);
    }
    const displayName =
      (typeof fullName === 'string' && fullName.trim()) || existingUser?.fullName || null;
    const photoUrl = selfiePhoto || existingUser?.profilePhoto || null;

    // Profile fields written on both create and re-submit. A re-submit returns
    // the mover to pending_verification (vehicle/KYC changes need re-review).
    const profileFields = {
      userId,
      displayName,
      photoUrl,
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
        [
          // Owner-only read. `mover_profiles` is the KYC collection — social
          // security number, tax number, driver's licence and its photograph,
          // VAT id, business address — so nobody but the mover may read the
          // row directly; clients get the redacted `listnearbymovers`
          // projection instead.
          //
          // The owner is `userId`, which IS the mover's Appwrite auth account
          // id (users.$id === account.$id). `profile.$id` is NOT an auth id and
          // must never be used here.
          //
          // No update/delete grant: every write to this row goes through a
          // function holding the API key (submitmoverprofile, setmoveronline,
          // updatemoverlocation, adminverifymover).
          Permission.read(Role.user(userId)),
        ],
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
          data: JSON.stringify({
            moverProfileId: profile.$id,
            i18nKey: 'verification.submitted',
            i18nParams: {},
          }),
          isRead: false,
        }, [
          // Addressee only. `update` is needed for markAsRead / markAllAsRead,
          // which the client app performs straight from the session.
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ])
        .catch((e) => error(`notification failed: ${e.message}`));
    }

    log(`Mover profile ${existing.documents.length > 0 ? 'updated' : 'created'}: ${profile.$id} for user ${userId}`);
    return res.json({ success: true, profile });
  } catch (err) {
    error(`Submit mover profile failed: ${err.message}`);
    return res.json({ error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
