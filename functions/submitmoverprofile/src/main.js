import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

import { countryToIso2 } from './country-code.js';
import { expiryToIso, residenceSubmissionError } from './vetting.js';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const USERS_COLLECTION = process.env.APPWRITE_COLLECTION_USERS;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;

const PLATFORM_CONFIG_COLLECTION =
  process.env.APPWRITE_COLLECTION_PLATFORM_CONFIG || 'platform_config';

// ── T9: country mapping + sanctions gate ─────────────────────────────────────
// `primaryCountry` is the English picker name (or free text on old rows).
// Resolution goes through the shared `country-code.js` mirror (plan
// wave-2026-10/4 C1) — the same table the tax ledger, matching and pricing
// use — so one spelling cannot resolve differently in two functions. Unknown
// countries map to null (never blocked: a typo must not lock a mover out;
// DAC7 KYC review catches residence later). Re-exported for the tests.
export { countryToIso2 };

/**
 * Operator-managed deny list (platform_config `sanctioned_countries`, JSON
 * array of ISO2). Data, not code: sanctions policy changes are a config edit.
 */
export function isSanctionedCountry(primaryCountry, sanctionedList) {
  const code = countryToIso2(primaryCountry);
  if (!code) return false;
  return Array.isArray(sanctionedList) && sanctionedList.includes(code);
}

// ── Driver vetting (plan legal/7) ───────────────────────────────────────────
// Residence status, moving certificate and the business-insurance declaration
// arrive either with the whole profile (registration) or on their own from a
// driver who is already registered (`action: 'vetting'`). Both paths go
// through this one builder, so the rules cannot differ between them.

const has = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * The vetting columns to write for this request body.
 *
 * Each of the three sections is written only when the caller sent it: an app
 * build from before the feature sends none, and its profile is stored as
 * before with `residenceStatus` left at `none` (an admin then cannot verify
 * it). A section that IS sent is validated in full.
 *
 * Returns `{ patch }` or `{ fnCode }` for a refusal.
 */
export function vettingPatch(body, nowMs) {
  const patch = {};
  const nowIso = new Date(nowMs).toISOString();

  const residenceGiven =
    body.residenceDocType != null || has(body.residenceDocFront) || has(body.residenceDocBack) || has(body.residenceDocExpiresAt);
  if (residenceGiven) {
    const fnCode = residenceSubmissionError(
      {
        docType: body.residenceDocType,
        front: body.residenceDocFront,
        back: body.residenceDocBack,
        expiresAt: body.residenceDocExpiresAt,
      },
      nowMs,
    );
    if (fnCode) return { fnCode };
    patch.residenceDocType = body.residenceDocType;
    patch.residenceDocFront = body.residenceDocFront.trim();
    patch.residenceDocBack = body.residenceDocBack.trim();
    patch.residenceDocExpiresAt = expiryToIso(body.residenceDocExpiresAt);
    // Every submission is reviewed again: a new photograph is a new document.
    patch.residenceStatus = 'pending_review';
    patch.residenceRejectionReason = null;
    patch.residenceReviewedAt = null;
    patch.residenceReviewedBy = null;
    patch.residenceExpiryNoticeDays = null;
  }

  if (typeof body.hasMovingCertificate === 'boolean') {
    if (body.hasMovingCertificate) {
      if (!has(body.movingCertificatePhoto)) return { fnCode: 'vetting.certificatePhotoRequired' };
      patch.hasMovingCertificate = true;
      patch.movingCertificatePhoto = body.movingCertificatePhoto.trim();
      patch.movingCertificateStatus = 'pending_review';
    } else {
      patch.hasMovingCertificate = false;
      patch.movingCertificatePhoto = null;
      patch.movingCertificateStatus = 'none';
    }
    patch.movingCertificateRejectionReason = null;
  }

  if (typeof body.hasBusinessInsurance === 'boolean') {
    patch.hasBusinessInsurance = body.hasBusinessInsurance;
    patch.insuranceDeclaredAt = nowIso;
  }

  return { patch };
}

const VETTING_REFUSALS = {
  'vetting.residenceTypeRequired': 'Choose passport or residence permit.',
  'vetting.residencePhotosRequired': 'Photograph both sides of the document.',
  'vetting.residenceExpiryRequired': 'Enter the date the document is valid until.',
  'vetting.residenceExpiryPast': 'This document has expired.',
  'vetting.certificatePhotoRequired': 'Add a photo of your moving certificate.',
};

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

    const vetting = vettingPatch(body, Date.now());
    if (vetting.fnCode) {
      return res.json({ error: VETTING_REFUSALS[vetting.fnCode] || 'Invalid request', fnCode: vetting.fnCode }, 400);
    }

    // A registered driver adding or replacing their documents. Only the vetting
    // columns are written: `verificationStatus` is NOT touched, so a verified
    // driver who uploads a residence document stays verified while it is
    // reviewed (the residence gate decides whether they may work meanwhile).
    if (body.action === 'vetting') {
      if (Object.keys(vetting.patch).length === 0) {
        return res.json({ error: 'Nothing to update', fnCode: 'generic.badRequest' }, 400);
      }
      const own = await databases.listDocuments(DATABASE_ID, MOVER_PROFILES_COLLECTION, [
        Query.equal('userId', userId),
        Query.limit(1),
      ]);
      if (own.documents.length === 0) return res.json({ error: 'Not a mover', fnCode: 'mover.notAMover' }, 403);
      const updated = await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, own.documents[0].$id, vetting.patch);
      log(`Mover vetting updated: ${updated.$id} (${Object.keys(vetting.patch).join(', ')})`);
      return res.json({ success: true, profile: updated });
    }

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
      vehicleOwnership,
      languages,
      yearsExperience,
    } = body;

    // Vehicle ownership (vehicles master plan §6.4 / D10). The vehicle itself
    // is no longer part of the profile: it is submitted separately through
    // `submitvehicle` as its own `vehicles` row with its own review status.
    // A caller that sends no ownership is a legacy owned-vehicle driver — on
    // CREATE only. On a re-submit an omitted value must leave the stored one
    // alone: defaulting there would silently turn a rented driver into an owned
    // one and drop them out of the daily SAME/CHANGE confirmation.
    const ownershipGiven = vehicleOwnership !== undefined && vehicleOwnership !== null;
    const ownership = ownershipGiven ? String(vehicleOwnership) : 'owned';
    if (ownership !== 'owned' && ownership !== 'rented') {
      return res.json({ error: 'vehicleOwnership must be owned|rented', fnCode: 'generic.badRequest' }, 400);
    }

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
            error: `PickLte does not operate in ${primaryCountry}. Mover onboarding is not available there.`,
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
    // An admin account must never become a mover. `users.userType` is single-
    // valued and is the admin console's ONLY role check, so the `userType:
    // 'mover'` write below used to demote the admin — on 2026-09-19 it locked
    // the last admin out of the console. Refuse before anything is written.
    if (existingUser?.userType === 'admin') {
      return res.json(
        { error: 'Admin accounts cannot register as movers. Use a separate account.', fnCode: 'mover.adminAccount' },
        403,
      );
    }
    // A client account stays a client (plan auth/2: one account, one app), as
    // the web's submit-profile route already enforces.
    if (existingUser?.userType === 'client') {
      return res.json(
        { error: 'Client accounts cannot register as movers. Use a separate account.', fnCode: 'mover.clientCannotConvert' },
        403,
      );
    }
    const displayName =
      (typeof fullName === 'string' && fullName.trim()) || existingUser?.fullName || null;
    const photoUrl = selfiePhoto || existingUser?.profilePhoto || null;

    // Profile fields written on both create and re-submit. A re-submit returns
    // the mover to pending_verification (KYC changes need re-review).
    //
    // The legacy vehicleBrand/Model/Year/Capacity/Registration/Type columns
    // are deliberately NOT written here any more: they are the snapshot of
    // the current VERIFIED vehicle and only the admin verify route writes
    // them (vehicles master plan D2), so pricing and capacity gating key on
    // verified data by construction.
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
      // ISO2 of `primaryCountry` (plan wave-2026-10/4 C1): the matching gate
      // and the tax ledger key on this column. Movers may register in a
      // country that is not open yet (C3) — they are simply offered nothing
      // until the operator flips it live.
      countryCode: countryToIso2(primaryCountry),
      languages: languages || [],
      yearsExperience: yearsExperience || 0,
      verificationStatus: 'pending_verification',
      // Residence status, certificate and insurance declaration (plan legal/7),
      // only the sections this caller sent.
      ...vetting.patch,
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
        // Rented → owned is an admin decision (vehicles master D16): it goes
        // through a vehicle submission and its review, never a profile re-submit.
        ownershipGiven && !(existing.documents[0].vehicleOwnership === 'rented' && ownership === 'owned')
          ? { ...profileFields, vehicleOwnership: ownership }
          : profileFields,
      );
    } else {
      profile = await databases.createDocument(
        DATABASE_ID,
        MOVER_PROFILES_COLLECTION,
        ID.unique(),
        {
          ...profileFields,
          vehicleOwnership: ownership,
          // No vehicle yet: the dashboard reads `none` as "add your vehicle"
          // (D10). Never reset on re-submit — the vehicle has its own status.
          vehicleStatus: 'none',
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
    // Only claim the role when the user row was actually read above: a failed
    // read must not turn into a blind role overwrite.
    const userUpdates = existingUser ? { userType: 'mover' } : {};
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
