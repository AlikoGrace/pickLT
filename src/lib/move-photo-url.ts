/**
 * Move photos (`coverPhotoId`, `galleryPhotoIds`) are stored as bare Appwrite
 * file ids, but older rows hold full URLs. `next/image` throws on a bare id,
 * so every place that renders a move photo resolves it through here.
 *
 * - file id          → bucket `view` URL
 * - http(s) URL      → as-is
 * - absolute path    → as-is (local/static assets)
 * - data:/blob: URI  → as-is (a draft's photos before upload)
 * - empty / unconfigured bucket → null (render the placeholder instead)
 *
 * Env is read per call (Next inlines `NEXT_PUBLIC_*` either way) so the node
 * test can stub it.
 */
export function movePhotoUrl(fileIdOrUrl: string | null | undefined): string | null {
  const value = fileIdOrUrl?.trim()
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('/')) return value
  if (value.startsWith('data:') || value.startsWith('blob:')) return value

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
  const bucketId = process.env.NEXT_PUBLIC_BUCKET_MOVE_PHOTOS || ''
  if (!endpoint || !projectId || !bucketId) return null
  return `${endpoint}/storage/buckets/${bucketId}/files/${value}/view?project=${projectId}`
}
