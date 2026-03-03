import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { ID } from 'node-appwrite'
import { InputFile } from 'node-appwrite/file'

/**
 * POST /api/moves/upload-photos
 *
 * Accepts base64-encoded images and uploads them to the MOVE_PHOTOS bucket.
 *
 * Body:
 *   coverPhoto  — base64 data-URL string (optional)
 *   galleryPhotos — array of base64 data-URL strings (optional)
 *
 * Returns:
 *   coverPhotoUrl  — full public URL for the cover photo (or null)
 *   galleryPhotoUrls — array of full public URLs
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

    let coverPhotoUrl: string | null = null
    const galleryPhotoUrls: string[] = []

    // Helper: convert a base64 data-URL to an InputFile, upload, return public URL
    const uploadBase64 = async (dataUrl: string, namePrefix: string): Promise<string> => {
      // data:image/jpeg;base64,/9j/4AAQ...
      const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!match) throw new Error('Invalid data URL format')

      const mimeType = match[1]
      const base64Data = match[2]
      const ext = mimeType.split('/')[1] || 'jpg'
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

    // Upload cover photo
    if (coverPhotoId) {
      coverPhotoUrl = await uploadBase64(coverPhotoId, `cover-${userId}`)
    }

    // Upload gallery photos (in parallel, max 10)
    if (galleryPhotoIds && galleryPhotoIds.length > 0) {
      const uploads = galleryPhotoIds.slice(0, 10).map((photo, idx) =>
        uploadBase64(photo, `gallery-${userId}-${idx}`)
      )
      const results = await Promise.all(uploads)
      galleryPhotoUrls.push(...results)
    }

    return NextResponse.json({ coverPhotoId: coverPhotoUrl, galleryPhotoIds: galleryPhotoUrls })
  } catch (err) {
    console.error('POST /api/moves/upload-photos error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to upload photos' },
      { status: 500 },
    )
  }
}
