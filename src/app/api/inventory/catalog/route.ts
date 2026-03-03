import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'

/**
 * GET /api/inventory/catalog
 *
 * Returns all inventory catalog items from the database.
 * Falls back to an empty array if the collection doesn't exist yet.
 *
 * DB schema (per BACKEND_ARCHITECTURE.md):
 *   itemId, name, category, widthCm, heightCm, depthCm, weightKg,
 *   moveClassificationWeight, moveTypeMinimum
 */
export async function GET() {
  try {
    const { databases } = createAdminClient()

    const result = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.INVENTORY_CATALOG,
      [Query.limit(200), Query.orderAsc('category')],
    )

    // Map Appwrite documents to the shape the frontend expects
    const items = result.documents.map((doc) => ({
      id: doc.itemId || doc.$id,
      name: doc.name,
      category: doc.category,
      meta: {
        widthCm: doc.widthCm ?? 0,
        heightCm: doc.heightCm ?? 0,
        depthCm: doc.depthCm ?? 0,
        weightKg: doc.weightKg ?? 0,
      },
      classificationPoints: doc.moveClassificationWeight ?? 3,
      moveTypeMinimum: doc.moveTypeMinimum ?? 'light',
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('GET /api/inventory/catalog error:', err)
    // Return empty so frontend can fall back to hardcoded items
    return NextResponse.json({ items: [] })
  }
}
