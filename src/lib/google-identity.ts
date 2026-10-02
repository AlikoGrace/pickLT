/**
 * Google Identity Services (GIS) — the browser half of "Google sign-in through
 * the `googleauth` function". Mirrors `pickltmobile/lib/oauth.ts`: the native
 * SDK there and GIS here both end in a Google ID token, which `googleauth`
 * verifies and turns into an Appwrite session (see `googleauth-client.ts`).
 *
 * This replaces Appwrite's hosted OAuth, which answers 409 `user_already_exists`
 * for any Google e-mail whose Appwrite user has no Google *identity* — every
 * account the mobile apps created, and every password account.
 *
 * ---------------------------------------------------------------------------
 * OPERATOR SETUP (Google Cloud Console → APIs & Services → Credentials)
 * ---------------------------------------------------------------------------
 * `NEXT_PUBLIC_GOOGLE_CLIENT_ID` must name a "Web application" OAuth client, and:
 *
 *  1. That client's "Authorized JavaScript origins" must list every origin the
 *     web app is served from — e.g. `https://pick-lt.vercel.app` and
 *     `http://localhost:3000` (no path, no trailing slash; Vercel preview
 *     domains need their own entries). GIS refuses to issue a credential from
 *     an unlisted origin ("The given origin is not allowed for the given
 *     client ID") and the button silently does nothing.
 *
 *  2. The same client id must be in the `googleauth` Appwrite function's
 *     `GOOGLE_CLIENT_ID` env var (a comma-separated allow-list, shared with the
 *     Android web-client id and the iOS client id). The function verifies the
 *     ID token's `aud` against that list and answers 401 `oauth.signInFailed`
 *     otherwise. Using the Android "web client id" here is fine — it is already
 *     allow-listed — as long as (1) is done on that same client.
 *
 * Nothing here throws at import time: a missing client id means "feature
 * unavailable" and the UI falls back to the hosted-OAuth button.
 */

/** The GIS credential callback payload (only the fields this app reads). */
export interface GoogleCredentialResponse {
  /** The Google ID token (JWT). */
  credential: string
  select_by?: string
  clientId?: string
}

interface GoogleIdConfiguration {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  ux_mode?: 'popup' | 'redirect'
  itp_support?: boolean
  use_fedcm_for_prompt?: boolean
}

export type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with' | 'signin'

export interface GoogleButtonConfiguration {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: GoogleButtonText
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  /** 200–400 px (GIS clamps outside that range). */
  width?: number | string
  /** BCP-47, e.g. `de`, `pl`. Defaults to the browser language. */
  locale?: string
}

/** The minimal `google.accounts.id` surface this app uses. */
export interface GoogleAccountsId {
  initialize(config: GoogleIdConfiguration): void
  renderButton(parent: HTMLElement, options: GoogleButtonConfiguration): void
  cancel?(): void
  disableAutoSelect?(): void
}

interface GoogleGlobal {
  accounts?: { id?: GoogleAccountsId }
}

export const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

/** GIS's documented width bounds for the rendered button. */
export const GOOGLE_BUTTON_MIN_WIDTH = 200
export const GOOGLE_BUTTON_MAX_WIDTH = 400

/**
 * The web OAuth client id, or `null` when Google sign-in is not configured
 * for this deployment (unset or blank). Read at call time, not at import, so a
 * build without the variable still boots; Next inlines the literal
 * `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID` at build.
 */
export function getGoogleClientId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  return trimmed.length > 0 ? trimmed : null
}

/** Clamp a measured container width into the range GIS will honour. */
export function clampGoogleButtonWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return GOOGLE_BUTTON_MAX_WIDTH
  return Math.min(GOOGLE_BUTTON_MAX_WIDTH, Math.max(GOOGLE_BUTTON_MIN_WIDTH, Math.floor(width)))
}

function readGoogleId(): GoogleAccountsId | null {
  if (typeof window === 'undefined') return null
  const g = (globalThis as unknown as { google?: GoogleGlobal }).google
  return g?.accounts?.id ?? null
}

let loadPromise: Promise<GoogleAccountsId> | null = null

/**
 * Load the GIS script once and resolve with `google.accounts.id`. Idempotent:
 * concurrent and repeated callers share one promise, and a `<script>` tag
 * already in the document (another caller, a layout) is reused rather than
 * duplicated. A failed load resets the promise so a later call can retry.
 * Rejects (never throws synchronously) on the server.
 */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('google-identity: browser only'))
  }
  if (loadPromise) return loadPromise

  loadPromise = new Promise<GoogleAccountsId>((resolve, reject) => {
    const ready = readGoogleId()
    if (ready) {
      resolve(ready)
      return
    }

    const onLoad = () => {
      const id = readGoogleId()
      if (id) resolve(id)
      else {
        loadPromise = null
        reject(new Error('google-identity: script loaded but google.accounts.id is missing'))
      }
    }
    const onError = () => {
      loadPromise = null
      reject(new Error('google-identity: failed to load the Google Identity Services script'))
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = GSI_SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })
  })

  return loadPromise
}

export interface InitializeGoogleIdOptions {
  clientId: string
  /** Receives the Google ID token (`credential`) when the user picks an account. */
  onCredential: (idToken: string) => void
}

/**
 * Configure GIS with the client id and credential callback. May be called
 * again (e.g. on a route change) — the latest callback wins, which is the
 * documented GIS behaviour. One Tap / auto-select are off: the button is the
 * only entry point, matching the mobile apps' explicit "Continue with Google".
 */
export async function initializeGoogleId(options: InitializeGoogleIdOptions): Promise<GoogleAccountsId> {
  const id = await loadGoogleIdentity()
  id.initialize({
    client_id: options.clientId,
    callback: (response) => {
      if (response && typeof response.credential === 'string' && response.credential) {
        options.onCredential(response.credential)
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
    ux_mode: 'popup',
    itp_support: true,
  })
  return id
}

export interface RenderGoogleButtonOptions {
  text: GoogleButtonText
  width: number
  theme?: GoogleButtonConfiguration['theme']
  size?: GoogleButtonConfiguration['size']
  locale?: string
}

/**
 * Render (or re-render) the GIS button into `container`. The container is
 * emptied first so width/locale changes replace the button instead of stacking
 * a second one. Requires `initializeGoogleId` to have run.
 */
export async function renderGoogleButton(
  container: HTMLElement,
  options: RenderGoogleButtonOptions,
): Promise<void> {
  const id = await loadGoogleIdentity()
  container.replaceChildren()
  id.renderButton(container, {
    type: 'standard',
    theme: options.theme ?? 'outline',
    size: options.size ?? 'large',
    text: options.text,
    shape: 'rectangular',
    logo_alignment: 'left',
    width: clampGoogleButtonWidth(options.width),
    locale: options.locale,
  })
}
