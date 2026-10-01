/**
 * Appwrite's hosted OAuth flow lands on the *failure* URL with the error
 * serialised into a `?error=` query parameter:
 *
 *   /login?type=client&error={"message":"A user with the same id, email, or
 *   phone already exists in this project.","type":"user_already_exists","code":409}
 *
 * The login page used to ignore it, so a Google account whose e-mail already
 * belongs to a password (or app-created) account bounced back to the choice
 * screen with no explanation. This maps the parameter to a catalog key.
 */
export interface OAuthErrorParam {
  type: string | null;
  code: number | null;
  message: string | null;
}

export function parseOAuthErrorParam(raw: string | null | undefined): OAuthErrorParam | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return { type: null, code: null, message: trimmed };
    return {
      type: typeof parsed.type === 'string' ? parsed.type : null,
      code: typeof parsed.code === 'number' ? parsed.code : null,
      message: typeof parsed.message === 'string' ? parsed.message : null,
    };
  } catch {
    // Appwrite occasionally sends a bare string; still worth showing something.
    return { type: null, code: null, message: trimmed };
  }
}

/** Catalog key for the error, so the page never shows Appwrite's English prose. */
export function oauthErrorMessageKey(err: OAuthErrorParam | null): string | null {
  if (!err) return null;
  if (err.type === 'user_already_exists' || err.code === 409) return 'auth:login.oauthExistingAccount.error';
  return 'auth:login.oauthFailed.error';
}
