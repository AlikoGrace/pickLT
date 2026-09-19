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

// Every English country name the apps' country picker can submit (ICU
// `Intl.DisplayNames('en', { type: 'region' })`, ISO-3166-1 alpha-2 + Kosovo),
// normalised by `normCountry`. GENERATED together with `pickltmover/lib/countries.ts`
// — the picker stores the English name, and without this table any country
// outside the hand-written aliases above resolved to null and skipped the
// sanctions gate. The tax functions keep their own narrower map on purpose:
// widening country resolution there changes which tax rules apply.
const ISO_NAME_CODES = {
  "afghanistan": 'AF', "aland islands": 'AX', "albania": 'AL', "algeria": 'DZ', "american samoa": 'AS',
  "andorra": 'AD', "angola": 'AO', "anguilla": 'AI', "antarctica": 'AQ', "antigua and barbuda": 'AG',
  "argentina": 'AR', "armenia": 'AM', "aruba": 'AW', "australia": 'AU', "austria": 'AT', "azerbaijan": 'AZ',
  "bahamas": 'BS', "bahrain": 'BH', "bangladesh": 'BD', "barbados": 'BB', "belarus": 'BY', "belgium": 'BE',
  "belize": 'BZ', "benin": 'BJ', "bermuda": 'BM', "bhutan": 'BT', "bolivia": 'BO',
  "bosnia and herzegovina": 'BA', "botswana": 'BW', "bouvet island": 'BV', "brazil": 'BR',
  "british indian ocean territory": 'IO', "british virgin islands": 'VG', "brunei": 'BN', "bulgaria": 'BG',
  "burkina faso": 'BF', "burundi": 'BI', "cambodia": 'KH', "cameroon": 'CM', "canada": 'CA',
  "cape verde": 'CV', "caribbean netherlands": 'BQ', "cayman islands": 'KY',
  "central african republic": 'CF', "chad": 'TD', "chile": 'CL', "china": 'CN', "christmas island": 'CX',
  "cocos (keeling) islands": 'CC', "colombia": 'CO', "comoros": 'KM', "congo - brazzaville": 'CG',
  "congo - kinshasa": 'CD', "cook islands": 'CK', "costa rica": 'CR', "cote d'ivoire": 'CI', "croatia": 'HR',
  "cuba": 'CU', "curacao": 'CW', "cyprus": 'CY', "czechia": 'CZ', "denmark": 'DK', "djibouti": 'DJ',
  "dominica": 'DM', "dominican republic": 'DO', "ecuador": 'EC', "egypt": 'EG', "el salvador": 'SV',
  "equatorial guinea": 'GQ', "eritrea": 'ER', "estonia": 'EE', "eswatini": 'SZ', "ethiopia": 'ET',
  "falkland islands": 'FK', "faroe islands": 'FO', "fiji": 'FJ', "finland": 'FI', "france": 'FR',
  "french guiana": 'GF', "french polynesia": 'PF', "french southern territories": 'TF', "gabon": 'GA',
  "gambia": 'GM', "georgia": 'GE', "germany": 'DE', "ghana": 'GH', "gibraltar": 'GI', "greece": 'GR',
  "greenland": 'GL', "grenada": 'GD', "guadeloupe": 'GP', "guam": 'GU', "guatemala": 'GT', "guernsey": 'GG',
  "guinea": 'GN', "guinea-bissau": 'GW', "guyana": 'GY', "haiti": 'HT', "heard and mcdonald islands": 'HM',
  "honduras": 'HN', "hong kong sar china": 'HK', "hungary": 'HU', "iceland": 'IS', "india": 'IN',
  "indonesia": 'ID', "iran": 'IR', "iraq": 'IQ', "ireland": 'IE', "isle of man": 'IM', "israel": 'IL',
  "italy": 'IT', "jamaica": 'JM', "japan": 'JP', "jersey": 'JE', "jordan": 'JO', "kazakhstan": 'KZ',
  "kenya": 'KE', "kiribati": 'KI', "kosovo": 'XK', "kuwait": 'KW', "kyrgyzstan": 'KG', "laos": 'LA',
  "latvia": 'LV', "lebanon": 'LB', "lesotho": 'LS', "liberia": 'LR', "libya": 'LY', "liechtenstein": 'LI',
  "lithuania": 'LT', "luxembourg": 'LU', "macao sar china": 'MO', "madagascar": 'MG', "malawi": 'MW',
  "malaysia": 'MY', "maldives": 'MV', "mali": 'ML', "malta": 'MT', "marshall islands": 'MH',
  "martinique": 'MQ', "mauritania": 'MR', "mauritius": 'MU', "mayotte": 'YT', "mexico": 'MX',
  "micronesia": 'FM', "moldova": 'MD', "monaco": 'MC', "mongolia": 'MN', "montenegro": 'ME',
  "montserrat": 'MS', "morocco": 'MA', "mozambique": 'MZ', "myanmar (burma)": 'MM', "namibia": 'NA',
  "nauru": 'NR', "nepal": 'NP', "netherlands": 'NL', "new caledonia": 'NC', "new zealand": 'NZ',
  "nicaragua": 'NI', "niger": 'NE', "nigeria": 'NG', "niue": 'NU', "norfolk island": 'NF',
  "north korea": 'KP', "north macedonia": 'MK', "northern mariana islands": 'MP', "norway": 'NO',
  "oman": 'OM', "pakistan": 'PK', "palau": 'PW', "palestinian territories": 'PS', "panama": 'PA',
  "papua new guinea": 'PG', "paraguay": 'PY', "peru": 'PE', "philippines": 'PH', "pitcairn islands": 'PN',
  "poland": 'PL', "portugal": 'PT', "puerto rico": 'PR', "qatar": 'QA', "reunion": 'RE', "romania": 'RO',
  "russia": 'RU', "rwanda": 'RW', "samoa": 'WS', "san marino": 'SM', "sao tome and principe": 'ST',
  "saudi arabia": 'SA', "senegal": 'SN', "serbia": 'RS', "seychelles": 'SC', "sierra leone": 'SL',
  "singapore": 'SG', "sint maarten": 'SX', "slovakia": 'SK', "slovenia": 'SI', "solomon islands": 'SB',
  "somalia": 'SO', "south africa": 'ZA', "south georgia and south sandwich islands": 'GS',
  "south korea": 'KR', "south sudan": 'SS', "spain": 'ES', "sri lanka": 'LK', "st. barthelemy": 'BL',
  "st. helena": 'SH', "st. kitts and nevis": 'KN', "st. lucia": 'LC', "st. martin": 'MF',
  "st. pierre and miquelon": 'PM', "st. vincent and grenadines": 'VC', "sudan": 'SD', "suriname": 'SR',
  "svalbard and jan mayen": 'SJ', "sweden": 'SE', "switzerland": 'CH', "syria": 'SY', "taiwan": 'TW',
  "tajikistan": 'TJ', "tanzania": 'TZ', "thailand": 'TH', "timor-leste": 'TL', "togo": 'TG', "tokelau": 'TK',
  "tonga": 'TO', "trinidad and tobago": 'TT', "tunisia": 'TN', "turkiye": 'TR', "turkmenistan": 'TM',
  "turks and caicos islands": 'TC', "tuvalu": 'TV', "u.s. outlying islands": 'UM',
  "u.s. virgin islands": 'VI', "uganda": 'UG', "ukraine": 'UA', "united arab emirates": 'AE',
  "united kingdom": 'GB', "united states": 'US', "uruguay": 'UY', "uzbekistan": 'UZ', "vanuatu": 'VU',
  "vatican city": 'VA', "venezuela": 'VE', "vietnam": 'VN', "wallis and futuna": 'WF',
  "western sahara": 'EH', "yemen": 'YE', "zambia": 'ZM', "zimbabwe": 'ZW',
};

/** Lower-case, accent-free, straight apostrophes, `&` → `and` — the key form of both tables. */
function normCountry(raw) {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/&/g, 'and')
    .trim();
}

export function countryToIso2(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase();
  if (COUNTRY_CODES[key]) return COUNTRY_CODES[key];
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();
  return ISO_NAME_CODES[normCountry(raw)] ?? null;
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
