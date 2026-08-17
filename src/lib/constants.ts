// ─── Appwrite IDs (read from environment variables) ─────
export const APPWRITE = {
  PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  DATABASE_ID: process.env.APPWRITE_DATABASE_ID!,

  // Collections
  COLLECTIONS: {
    USERS: process.env.APPWRITE_COLLECTION_USERS!,
    MOVER_PROFILES: process.env.APPWRITE_COLLECTION_MOVER_PROFILES!,
    CREW_MEMBERS: process.env.APPWRITE_COLLECTION_CREW_MEMBERS!,
    MOVES: process.env.APPWRITE_COLLECTION_MOVES!,
    MOVE_REQUESTS: process.env.APPWRITE_COLLECTION_MOVE_REQUESTS!,
    MOVER_LOCATIONS: process.env.APPWRITE_COLLECTION_MOVER_LOCATIONS!,
    MOVE_STATUS_HISTORY: process.env.APPWRITE_COLLECTION_MOVE_STATUS_HISTORY!,
    PAYMENTS: process.env.APPWRITE_COLLECTION_PAYMENTS!,
    REVIEWS: process.env.APPWRITE_COLLECTION_REVIEWS!,
    NOTIFICATIONS: process.env.APPWRITE_COLLECTION_NOTIFICATIONS!,
    INVENTORY_CATALOG: process.env.APPWRITE_COLLECTION_INVENTORY_CATALOG!,
    // T8 tax statements — custom ids are stable across environments.
    TAX_STATEMENTS: process.env.APPWRITE_COLLECTION_TAX_STATEMENTS || 'tax_statements',
  },

  // Cloud Functions
  FUNCTIONS: {
    CREATE_MOVE: process.env.NEXT_PUBLIC_FUNCTION_CREATE_MOVE!,
    CALCULATE_PRICE: process.env.NEXT_PUBLIC_FUNCTION_CALCULATE_PRICE!,
    SUBMIT_MOVER_PROFILE: process.env.NEXT_PUBLIC_FUNCTION_SUBMIT_MOVER_PROFILE!,
    ADMIN_VERIFY_MOVER: process.env.NEXT_PUBLIC_FUNCTION_ADMIN_VERIFY_MOVER!,
    BROADCAST_MOVE_REQUEST: process.env.NEXT_PUBLIC_FUNCTION_BROADCAST_MOVE_REQUEST!,
    UPDATE_MOVER_LOCATION: process.env.NEXT_PUBLIC_FUNCTION_UPDATE_MOVER_LOCATION!,
    UPDATE_MOVE_STATUS: process.env.NEXT_PUBLIC_FUNCTION_UPDATE_MOVE_STATUS!,
    SUBMIT_REVIEW: process.env.NEXT_PUBLIC_FUNCTION_SUBMIT_REVIEW!,
    // PROCESS_PAYMENT and SEND_NOTIFICATION are intentionally absent.
    // processpayment marked moves paid with no authentication and no payment
    // provider; sendnotification wrote a notification to any userId with no
    // caller check. Both were unreferenced, and both are decommissioned.
    // Payments settle via chargemove (card) or confirmpayment (cash);
    // notifications are written server-side by lib/notify.ts.
  },

  // Storage Buckets
  BUCKETS: {
    PROFILE_PHOTOS: process.env.NEXT_PUBLIC_BUCKET_PROFILE_PHOTOS!,
    MOVE_PHOTOS: process.env.NEXT_PUBLIC_BUCKET_MOVE_PHOTOS!,
    TAX_STATEMENTS: process.env.BUCKET_TAX_STATEMENTS || 'tax-statements',
  },
}

// ─── Appwrite Endpoint ──────────────────────────────────
export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
