import { Client, Account, Databases, Functions, Storage } from 'appwrite'

// ─── Appwrite Client SDK (for browser / client-side) ───
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
// Cloud-function executions from the browser (e.g. `googleauth`, which is
// executable by guests so the Google sign-in path can mint a session).
export const functions = new Functions(client)

export { client }
