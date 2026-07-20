/**
 * Value normalizers for the `moves` collection write paths.
 *
 * Several `moves` attributes are text or text[] columns. When a caller sends a
 * raw object/array where Appwrite expects a string, the value is coerced to
 * "[object Object]" and the whole write is rejected with:
 *   `"[object Object]" is not valid`
 *
 * Callers historically disagree on whether they pre-stringify their custom
 * items / inventory (some paths stringify, some pass raw objects). These
 * helpers normalize at every write point so no object ever reaches a text
 * column raw. Mirrors the `asText` / `asTextArray` helpers in
 * `functions/createmove/src/main.js`.
 */

/** Coerce a value destined for a single text/JSON column to a plain string. */
export function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** Coerce a value destined for a text[] column to an array of plain strings. */
export function asTextArray(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .filter((v) => v !== null && v !== undefined)
    .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
}
