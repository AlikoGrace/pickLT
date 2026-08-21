import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { resolveLocale } from '@/lib/i18n-server'
import { compareLocalizedNames, localizedItemName } from '@/lib/inventory-i18n'
import { Query } from 'node-appwrite'

/**
 * GET /api/inventory/catalog
 *
 * Returns all inventory catalog items from the database.
 * Falls back to an empty array if the collection doesn't exist yet.
 *
 * DB schema (per BACKEND_ARCHITECTURE.md):
 *   itemId, name, category, widthCm, heightCm, depthCm, weightKg,
 *   moveClassificationWeight, moveTypeMinimum, nameTranslations
 *
 * `name` is resolved to the REQUEST'S LOCALE here rather than on the client
 * (master plan D7): every consumer — both wizard pages and `useInventoryNames`
 * — reads `name`, so resolving once on the server keeps six call sites honest
 * and means a page that never touches i18next still renders translated items.
 * `englishName` and `nameTranslations` ride along for anything that needs to
 * match on the original wording.
 */
export async function GET() {
  try {
    const locale = await resolveLocale()
    const { databases } = createAdminClient()

    const result = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.INVENTORY_CATALOG,
      // 500, not 200: the admin platform owns this catalog, and silently
      // truncating it would hide items an admin added.
      [Query.limit(500), Query.orderAsc('category')],
    )

    // Map Appwrite documents to the shape the frontend expects
    const items = result.documents.map((doc) => ({
      id: doc.itemId || doc.$id,
      name: localizedItemName(
        { itemId: doc.itemId || doc.$id, name: doc.name, nameTranslations: doc.nameTranslations },
        locale,
      ),
      englishName: doc.name,
      nameTranslations: doc.nameTranslations ?? null,
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

    // Collate by the localized name so the wizard's lists read alphabetically
    // in the user's language, not in English order.
    items.sort(
      (a, b) =>
        String(a.category).localeCompare(String(b.category)) ||
        compareLocalizedNames(a.name, b.name, locale),
    )

    return NextResponse.json({ items, locale })
  } catch (err) {
    console.error('GET /api/inventory/catalog error:', err)
    // Return empty so frontend can fall back to hardcoded items
    return NextResponse.json({ items: [] })
  }
}
