import { Client, Databases, Storage, Users } from 'node-appwrite'

// ─── Appwrite Server SDK (for API routes / server components) ───
function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!)

  return {
    client,
    databases: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
  }
}

/**
 * Retry wrapper for Appwrite SDK calls that may fail with ETIMEDOUT.
 * Retries up to `maxRetries` times with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err
      const isTimeout =
        err instanceof Error &&
        (err.message.includes('fetch failed') ||
          (err.cause instanceof AggregateError &&
            String(err.cause).includes('ETIMEDOUT')))
      if (!isTimeout || attempt === maxRetries) throw err
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt))
    }
  }
  throw lastError
}

export { createAdminClient }
