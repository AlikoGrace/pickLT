import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE, APPWRITE_ENDPOINT } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { ID } from 'node-appwrite'
import { InputFile } from 'node-appwrite/file'
import sharp from 'sharp'

/**
 * POST /api/user/upload-photo
 * 
 * Uploads a profile photo to Appwrite Storage and updates the user's profile.
 * Accepts multipart/form-data with a "file" field.
 * Images are compressed server-side (max 1920px, JPEG 80% quality) to save storage.
 * Returns the public URL of the uploaded file.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const purpose = (formData.get('purpose') as string) || 'selfie'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Max 10MB raw (will be compressed)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 })
    }

    const { storage, databases } = createAdminClient()

    // ── Compress image server-side ───────────────────────────
    const arrayBuffer = await file.arrayBuffer()
    let compressed: Buffer

    try {
      compressed = await sharp(Buffer.from(arrayBuffer))
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer()
    } catch {
      // If sharp fails (e.g. unsupported format), fall back to original
      compressed = Buffer.from(arrayBuffer)
    }

    const uint8 = new Uint8Array(compressed)
    const fileName = file.name.replace(/\.[^.]+$/, '.jpg')

    // Upload to Appwrite Storage
    const fileId = ID.unique()
    await storage.createFile(
      APPWRITE.BUCKETS.PROFILE_PHOTOS,
      fileId,
      InputFile.fromBuffer(uint8, fileName)
    )

    // Build the public preview URL
    const photoUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE.BUCKETS.PROFILE_PHOTOS}/files/${fileId}/view?project=${APPWRITE.PROJECT_ID}`

    // Only update the user's profile photo for selfie uploads, not license/document uploads
    if (purpose === 'selfie') {
      await databases.updateDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.USERS,
        userId,
        { profilePhoto: photoUrl }
      )
    }

    return NextResponse.json({ success: true, photoUrl })
  } catch (err) {
    console.error('POST /api/user/upload-photo error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to upload photo' },
      { status: 500 }
    )
  }
}
