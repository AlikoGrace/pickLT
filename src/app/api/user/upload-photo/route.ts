import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE, APPWRITE_ENDPOINT } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { ID, Permission, Role } from 'node-appwrite'
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
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const purpose = (formData.get('purpose') as string) || 'selfie'

    if (!file) {
      return NextResponse.json({ error: t('errors:upload.noFile') }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: t('errors:upload.notAnImage2') }, { status: 400 })
    }

    // Max 10MB raw (will be compressed)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: t('errors:upload.tooLarge2') }, { status: 400 })
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

    // Upload to Appwrite Storage.
    //
    // `purpose` decides the permissions, because this one route uploads two very
    // different things into the same bucket. A selfie is an avatar rendered by
    // bare <img>/<Image> tags across four apps, which present no Appwrite
    // identity — it keeps whatever the bucket allows (unchanged behaviour).
    // Anything else here is a KYC document (the driver's-licence scan), and it
    // gets an explicit owner-only grant: it is displayed solely through the
    // admin console's authorised proxy, so it must never become world-readable.
    const isSelfie = purpose === 'selfie'
    const fileId = ID.unique()
    await storage.createFile(
      APPWRITE.BUCKETS.PROFILE_PHOTOS,
      fileId,
      InputFile.fromBuffer(uint8, fileName),
      isSelfie ? undefined : [Permission.read(Role.user(userId))]
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
      { error: err instanceof Error ? err.message : t('errors:upload.photoFailed') },
      { status: 500 }
    )
  }
}
