/**
 * Where a move photo is loaded from (plan legal/4.private-photos).
 *
 * Move photos live in a private bucket. The browser cannot load them from
 * Appwrite: an `<img>` sends no Appwrite session. It loads them from this
 * site's own `/api/photos/move/...` route, which checks the site session, checks
 * that the signed-in user may see that move, and streams the bytes.
 *
 * `coverPhotoId` / `galleryPhotoIds` hold bare file ids; older rows hold full
 * Appwrite view URLs. Both are reduced to the file id.
 *
 * - file id / Appwrite view URL → `/api/photos/move/<fileId>?m=<move>`
 * - absolute path               → as-is (local/static assets)
 * - data:/blob: URI             → as-is (a draft's photos before upload)
 * - other http(s) URL           → as-is (not ours)
 * - empty, or no move to name   → null (render the placeholder instead)
 *
 * `moveKey` is the move's document id or its handle: the route needs it to
 * know which move the caller claims the photo belongs to.
 */

const PROXY_PREFIX = '/api/photos/move/'

/** A stored reference → its Appwrite file id, or null when it is not one. */
export function toFileId(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null
  const m = /\/storage\/buckets\/[^/]+\/files\/([^/?#]+)/.exec(raw)
  if (m) return decodeURIComponent(m[1])
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(raw) ? raw : null
}

export function movePhotoUrl(
  fileIdOrUrl: string | null | undefined,
  moveKey: string | null | undefined,
): string | null {
  const value = fileIdOrUrl?.trim()
  if (!value) return null
  if (value.startsWith('/')) return value
  if (value.startsWith('data:') || value.startsWith('blob:')) return value

  const fileId = toFileId(value)
  if (!fileId) {
    return value.startsWith('http://') || value.startsWith('https://') ? value : null
  }
  const key = moveKey?.trim()
  if (!key) return null
  return `${PROXY_PREFIX}${encodeURIComponent(fileId)}?m=${encodeURIComponent(key)}`
}

/**
 * True for a URL served by the photo route. `next/image` must render these
 * with `unoptimized`: the optimiser would store the image in a cache that is
 * served to anyone who asks for the same `/_next/image` URL.
 */
export function isMovePhotoProxyUrl(src: unknown): boolean {
  return typeof src === 'string' && src.startsWith(PROXY_PREFIX)
}
