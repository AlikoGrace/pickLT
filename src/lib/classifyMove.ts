import type { MoveType } from '@/lib/types'

// ─── Inventory item definition (matches frontend catalog) ──
export interface InventoryItemDef {
  id: string
  name: string
  category: string
  meta: {
    widthCm: number
    heightCm: number
    depthCm: number
    weightKg: number
  }
  classificationPoints: number
  moveTypeMinimum: MoveType
}

// ─── Classification result ─────────────────────────────────
/** A warning as a translation key and its params, resolved by the renderer. */
export interface ClassificationWarning {
  key: string
  params?: Record<string, string>
}

export interface MoveClassification {
  recommendedType: MoveType
  totalPoints: number
  totalWeightKg: number
  totalVolumeCm3: number
  totalItems: number
  /**
   * i18next keys plus their interpolation params, not resolved copy.
   * Classification is pure maths that runs during SSR as well as in the
   * browser, so it must not resolve text itself — the caller renders each
   * entry with its own request-scoped `t`.
   */
  warningKeys: ClassificationWarning[]
  requiresUpgrade: boolean
  upgradeFrom?: MoveType
  upgradeTo?: MoveType
}

// ─── Custom item type ──────────────────────────────────────
export interface CustomItemInput {
  id: string
  name: string
  quantity: number
  estimatedWeightKg?: number
}

// ─── Thresholds ────────────────────────────────────────────
const THRESHOLDS = {
  light: { maxPoints: 25, maxWeightKg: 200, maxItems: 15 },
  regular: { maxPoints: 80, maxWeightKg: 800, maxItems: 40 },
  // premium: anything above regular
} as const

const TYPE_ORDER: Record<MoveType, number> = { light: 0, regular: 1, premium: 2 }

// ─── Main classification function ──────────────────────────
export function classifyMove(
  inventory: Record<string, number>,
  customItems: CustomItemInput[],
  currentMoveType: MoveType,
  itemCatalog: InventoryItemDef[]
): MoveClassification {
  let totalPoints = 0
  let totalWeightKg = 0
  let totalVolumeCm3 = 0
  let totalItems = 0
  const warningKeys: ClassificationWarning[] = []

  // Calculate from catalog items
  for (const [itemId, quantity] of Object.entries(inventory)) {
    if (quantity <= 0) continue
    const item = itemCatalog.find((i) => i.id === itemId)
    if (!item) continue

    totalPoints += item.classificationPoints * quantity
    totalWeightKg += item.meta.weightKg * quantity
    totalVolumeCm3 +=
      (item.meta.widthCm * item.meta.heightCm * item.meta.depthCm) * quantity
    totalItems += quantity

    // Single-item minimum check
    if (item.moveTypeMinimum === 'premium' && currentMoveType !== 'premium') {
      warningKeys.push({
        key: 'booking:classification.itemMinimum.premium',
        params: { item: item.name },
      })
    } else if (item.moveTypeMinimum === 'regular' && currentMoveType === 'light') {
      warningKeys.push({
        key: 'booking:classification.itemMinimum.regular',
        params: { item: item.name },
      })
    }
  }

  // Add estimated values for custom items
  for (const custom of customItems) {
    if (custom.quantity <= 0) continue
    totalItems += custom.quantity
    totalPoints += 3 * custom.quantity // Default 3 points each
    totalWeightKg += (custom.estimatedWeightKg ?? 20) * custom.quantity
    totalVolumeCm3 += 50 * 50 * 50 * custom.quantity // ~125,000 cm³ each
  }

  // Determine recommended type
  let recommendedType: MoveType = 'light'
  if (
    totalPoints > THRESHOLDS.regular.maxPoints ||
    totalWeightKg > THRESHOLDS.regular.maxWeightKg ||
    totalItems > THRESHOLDS.regular.maxItems
  ) {
    recommendedType = 'premium'
  } else if (
    totalPoints > THRESHOLDS.light.maxPoints ||
    totalWeightKg > THRESHOLDS.light.maxWeightKg ||
    totalItems > THRESHOLDS.light.maxItems
  ) {
    recommendedType = 'regular'
  }

  // Upgrade required?
  const requiresUpgrade = TYPE_ORDER[recommendedType] > TYPE_ORDER[currentMoveType]

  // Warning thresholds (80% of next tier)
  if (currentMoveType === 'light' && totalPoints > 20) {
    warningKeys.push({ key: 'booking:classification.nearLimit.light' })
  }
  if (currentMoveType === 'regular' && totalPoints > 64) {
    warningKeys.push({ key: 'booking:classification.nearLimit.regular' })
  }

  return {
    recommendedType,
    totalPoints,
    totalWeightKg,
    totalVolumeCm3,
    totalItems,
    warningKeys,
    requiresUpgrade,
    upgradeFrom: requiresUpgrade ? currentMoveType : undefined,
    upgradeTo: requiresUpgrade ? recommendedType : undefined,
  }
}

// ─── Classification weights lookup ─────────────────────────
// Maps itemId → classificationPoints (fallback for items not found in DB)
export const DEFAULT_CLASSIFICATION_POINTS: Record<string, number> = {
  cardboard_boxes: 2,
  suitcases: 2,
  lamp: 1,
  plants: 1,
  microwave: 2,
  nightstand: 2,
  chairs: 1,
  mirror: 2,
  rug: 2,
  coffee_table: 3,
  tv: 2,
  tv_stand: 4,
  office_chair: 2,
  office_desk: 5,
  armchair: 4,
  bookshelf: 5,
  filing_cabinet: 4,
  bicycle: 3,
  sofa_2seater: 8,
  sofa_3seater: 12,
  bed_90cm: 6,
  bed_140cm: 8,
  bed_160cm: 10,
  mattress: 5,
  dining_table_small: 5,
  dining_table_large: 8,
  fridge_small: 4,
  fridge_medium: 6,
  fridge_large: 10,
  dishwasher: 5,
  wardrobe_small: 8,
  wardrobe_medium: 12,
  wardrobe_large: 18,
  piano: 25,
  safe: 20,
  treadmill: 15,
  aquarium: 12,
  glass_cabinet: 10,
  artwork_fragile: 5,
}
