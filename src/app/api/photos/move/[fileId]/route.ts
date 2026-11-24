import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'

import { createAdminClient } from '@/lib/appwrite-server'
import { getSessionUserId } from '@/lib/auth-session'
import { APPWRITE } from '@/lib/constants'
import { LIVE_OFFER_STATUSES, authorizeMovePhoto } from '@/lib/move-photo-access'

/**
 * GET /api/photos/move/[fileId]?m=<move id or handle>
 *
 * Serves one move photo (plan legal/4.private-photos). The bucket is private
 * and an `<img>` cannot present an Appwrite session, so the browser loads move
 * photos from here: the site session says who is asking, `authorizeMovePhoto`
 * says whether they may see that move and whether the file is one of its
 * photos, and the bytes are read with the server key.
 *
 * `private` caching only: a shared cache must never hold these.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const userId = await getSessionUserId()
    const { fileId } = await params
    const moveKey = req.nextUrl.searchParams.get('m')
    const { databases, storage } = createAdminClient()

    const access = await authorizeMovePhoto(
      {
        findMove: async (key) => {
          const list = await databases.listDocuments(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVES, [
            Query.or([Query.equal('$id', key), Query.equal('handle', key)]),
            Query.limit(1),
          ])
          return list.documents[0] ?? null
        },
        findProfile: async (uid) => {
          const list = await databases.listDocuments(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVER_PROFILES, [
            Query.equal('userId', uid),
            Query.limit(1),
          ])
          return list.documents[0] ?? null
        },
        hasOffer: async (moverProfileId, moveId) => {
          const list = await databases.listDocuments(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVE_REQUESTS, [
            Query.equal('moverProfileId', moverProfileId),
            Query.equal('moveId', moveId),
            Query.equal('status', LIVE_OFFER_STATUSES),
            Query.limit(1),
          ])
          return list.documents.length > 0
        },
      },
      { userId, moveKey, fileId },
    )
    if (!access.ok) return new NextResponse(null, { status: access.status })

    const bucket = APPWRITE.BUCKETS.MOVE_PHOTOS
    const [meta, bytes] = await Promise.all([storage.getFile(bucket, fileId), storage.getFileView(bucket, fileId)])
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': meta.mimeType || 'image/jpeg',
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    if ((err as { code?: number })?.code === 404) return new NextResponse(null, { status: 404 })
    console.error('GET /api/photos/move error:', err)
    return new NextResponse(null, { status: 500 })
  }
}
