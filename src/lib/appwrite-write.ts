/**
 * Schema-staging helper (plans `wave-2026-10/1` §4, `wave-2026-10/4` §5).
 *
 * The wave adds columns (`users.countryCode`, `moves.countryCode`,
 * `mover_profiles.countryCode`, the rental fields) that reach production with
 * the schema scripts, possibly after this code. Appwrite rejects a document
 * that names an attribute the collection does not have — which would fail a
 * sign-up or a booking over a column that is purely additive. So a write that
 * carries one of the new columns retries without the attribute Appwrite named,
 * logs it, and otherwise behaves exactly as before. Bounded; anything that is
 * not an unknown-attribute failure is rethrown untouched.
 */

/** `Invalid document structure: Unknown attribute: "countryCode"` → `countryCode`. */
export function unknownAttributeOf(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  const m = /[Uu]nknown attribute:?\s*"?([A-Za-z0-9_]+)"?/.exec(msg)
  return m ? m[1] : null
}

export async function writeDroppingUnknownAttributes<T>(
  data: Record<string, unknown>,
  write: (data: Record<string, unknown>) => Promise<T>,
  tag = 'appwrite',
): Promise<T> {
  let payload = { ...data }
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await write(payload)
    } catch (err) {
      const attr = unknownAttributeOf(err)
      if (!attr || !(attr in payload)) throw err
      console.warn(`[${tag}] attribute "${attr}" not in schema yet; writing without it`)
      const { [attr]: _dropped, ...rest } = payload
      payload = rest
    }
  }
  return write(payload)
}
