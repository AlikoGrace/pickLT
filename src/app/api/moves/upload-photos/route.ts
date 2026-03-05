import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { ID } from 'node-appwrite'
import { InputFile } from 'node-appwrite/file'

// Allow up to 60 s for large uploads and ensure Node runtime
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/moves/upload-photos
 *
 * Accepts base64-encoded images and uploads them to the MOVE_PHOTOS bucket.
 *
 * Body:
 *   coverPhotoId   — base64 data-URL string (optional)
 *   galleryPhotoIds — array of base64 data-URL strings (optional)
 *
 * Returns:
 *   coverPhotoId   — full public URL for the cover photo (or null)
 *   galleryPhotoIds — array of full public URLs for gallery photos
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { coverPhotoId, galleryPhotoIds } = body as {
      coverPhotoId?: string | null
      galleryPhotoIds?: string[]
    }

    const { storage } = createAdminClient()
    const bucketId = APPWRITE.BUCKETS.MOVE_PHOTOS
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
    const projectId = APPWRITE.PROJECT_ID

    let uploadedCoverUrl: string | null = null
    const uploadedGalleryUrls: string[] = []

    // Helper: convert a base64 data-URL to an InputFile, upload, return public URL
    const uploadBase64 = async (dataUrl: string, namePrefix: string): Promise<string> => {
      // Support standard data URLs: data:image/jpeg;base64,/9j/4AAQ...
      // Also handle URLs that might already be uploaded (start with http)
      if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
        return dataUrl // Already a URL, no upload needed
      }

      const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/)
      if (!match) throw new Error(`Invalid data URL format (prefix: ${dataUrl.substring(0, 30)}...)`)

      const mimeType = match[1]
      const base64Data = match[2]
      const ext = mimeType.split('/')[1]?.replace(/[+.-].*/g, '') || 'jpg'
      const buffer = Buffer.from(base64Data, 'base64')
      const uint8 = new Uint8Array(buffer)
      const fileName = `${namePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const file = await storage.createFile(
        bucketId,
        ID.unique(),
        InputFile.fromBuffer(uint8, fileName),
      )

      // Return the full public URL for this file
      return `${endpoint}/storage/buckets/${bucketId}/files/${file.$id}/view?project=${projectId}`
    }

    // ── Upload cover photo ──────────────────────────────────
    if (coverPhotoId) {
      try {
        uploadedCoverUrl = await uploadBase64(coverPhotoId, `cover-${userId}`)
      } catch (coverErr) {
        console.error('Cover photo upload failed:', coverErr)
        // Continue — gallery uploads can still proceed
      }
    }

    // ── Upload gallery photos (in parallel, max 10) ─────────
    // Use allSettled so one failure doesn't lose the rest
    if (galleryPhotoIds && galleryPhotoIds.length > 0) {
      const results = await Promise.allSettled(
        galleryPhotoIds.slice(0, 10).map((photo, idx) =>
          uploadBase64(photo, `gallery-${userId}-${idx}`)
        )
      )
      for (const r of results) {
        if (r.status === 'fulfilled') {
          uploadedGalleryUrls.push(r.value)
        } else {
          console.error('Gallery photo upload failed:', r.reason)
        }
      }
    }

    console.log(
      `[upload-photos] cover=${uploadedCoverUrl ? 'OK' : 'null'}, gallery=${uploadedGalleryUrls.length} URLs`
    )

    return NextResponse.json({
      coverPhotoId: uploadedCoverUrl,
      galleryPhotoIds: uploadedGalleryUrls,
    })
  } catch (err) {
    console.error('POST /api/moves/upload-photos error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to upload photos' },
      { status: 500 },
    )
  }
}
