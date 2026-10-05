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
  /**
   * Admin-set price one unit of this item adds to a move (pricing master D6).
   * Optional on the type because rows written before the column existed carry
   * `null`; the engine prices those as 0 and lists them in
   * `assumptions.unpricedItemIds`. Never used for classification.
   */
  unitPriceEur?: number | null
  /** Movers needed to handle one unit safely (piano = 2). Default 1. */
  requiredCrew?: number | null
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
  /** Σ raw bounding-box m³ (catalog dimensions × qty; custom items by size band). */
  totalVolumeM3: number
  /** `totalVolumeM3 × packingFactor` — the volume the `maxM3` limits are compared with. */
  loadedVolumeM3: number
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
  /** Total weight per unit; the caller decides any default. Missing reads as 0. */
  estimatedWeightKg?: number
  /** `small | medium | large | extra_large` (see `normalizeCustomSize`); anything else reads as medium. */
  approxSize?: string | null
}

// ─── Thresholds ────────────────────────────────────────────
// Port of pickltmobile/lib/classify-move.ts (crew master D4): must decide
// exactly as the app and the server do — the shared golden fixture's
// `classification` blocks pin it.

/**
 * The cut-offs of one tier. A basket stays in the tier while at or under EVERY
 * limit. `maxM3` is LOADED volume (raw bounding-box m³ × `packingFactor`), on
 * the scale of the vehicle each tier is sold with: Normal ≤ 10 m³ (small van),
 * Medium ≤ 25 m³ (medium truck), above → Premium (large truck).
 */
export interface TierLimits {
  maxPoints: number
  maxWeightKg: number
  maxItems: number
  /** Loaded m³ (raw × packingFactor). */
  maxM3: number
}

export interface ClassifyThresholds {
  light: TierLimits
  regular: TierLimits
  /** Raw → loaded volume factor; `volume.packingFactor` in pricing_config. */
  packingFactor: number
}

export const DEFAULT_CLASSIFY_THRESHOLDS: ClassifyThresholds = {
  light: { maxPoints: 25, maxWeightKg: 200, maxItems: 15, maxM3: 10 },
  regular: { maxPoints: 80, maxWeightKg: 800, maxItems: 40, maxM3: 25 },
  // premium: anything above regular
  packingFactor: 1.35,
}

const TYPE_ORDER: Record<MoveType, number> = { light: 0, regular: 1, premium: 2 }

type CustomSize = 'small' | 'medium' | 'large' | 'extra_large'
const CUSTOM_SIZE_POINTS: Record<CustomSize, number> = { small: 2, medium: 5, large: 10, extra_large: 18 }
export const CUSTOM_SIZE_M3: Record<CustomSize, number> = { small: 0.1, medium: 0.5, large: 1.5, extra_large: 3 }

function customSize(raw: unknown): CustomSize {
  return typeof raw === 'string' && raw in CUSTOM_SIZE_POINTS ? (raw as CustomSize) : 'medium'
}

/** The higher of two tiers — the tier a server prices at (crew master D5). */
export function enforcedTier(a: MoveType, b: MoveType): MoveType {
  return TYPE_ORDER[b] > TYPE_ORDER[a] ? b : a
}

/**
 * Thresholds from a `pricing_config` override map (`classify.*` and
 * `volume.packingFactor`); a missing or non-finite key keeps its default.
 */
export function thresholdsFromConfig(
  config: Partial<Record<string, number>> | null | undefined
): ClassifyThresholds {
  const read = (tier: 'light' | 'regular', field: keyof TierLimits): number => {
    const v = config?.[`classify.${tier}.${field}`]
    return typeof v === 'number' && Number.isFinite(v) ? v : DEFAULT_CLASSIFY_THRESHOLDS[tier][field]
  }
  const limits = (tier: 'light' | 'regular'): TierLimits => ({
    maxPoints: read(tier, 'maxPoints'),
    maxWeightKg: read(tier, 'maxWeightKg'),
    maxItems: read(tier, 'maxItems'),
    maxM3: read(tier, 'maxM3'),
  })
  const pf = config?.['volume.packingFactor']
  return {
    light: limits('light'),
    regular: limits('regular'),
    packingFactor: typeof pf === 'number' && Number.isFinite(pf) ? pf : DEFAULT_CLASSIFY_THRESHOLDS.packingFactor,
  }
}

function exceeds(limits: TierLimits, points: number, weightKg: number, items: number, m3: number): boolean {
  return points > limits.maxPoints || weightKg > limits.maxWeightKg || items > limits.maxItems || m3 > limits.maxM3
}

// ─── Main classification function ──────────────────────────
export function classifyMove(
  inventory: Record<string, number>,
  customItems: CustomItemInput[],
  currentMoveType: MoveType,
  itemCatalog: InventoryItemDef[],
  thresholds: ClassifyThresholds = DEFAULT_CLASSIFY_THRESHOLDS
): MoveClassification {
  let totalPoints = 0
  let totalWeightKg = 0
  let totalVolumeCm3 = 0
  let totalVolumeM3 = 0
  let totalItems = 0
  let highestMinType: MoveType = 'light'
  const warningKeys: ClassificationWarning[] = []

  // Calculate from catalog items
  for (const [itemId, quantity] of Object.entries(inventory)) {
    if (quantity <= 0) continue
    const item = itemCatalog.find((i) => i.id === itemId)
    if (!item) continue

    totalPoints += item.classificationPoints * quantity
    totalWeightKg += item.meta.weightKg * quantity
    const unitCm3 = item.meta.widthCm * item.meta.heightCm * item.meta.depthCm
    totalVolumeCm3 += unitCm3 * quantity
    // A row with a missing dimension adds no size rather than NaN.
    const unitM3 = unitCm3 / 1_000_000
    if (Number.isFinite(unitM3) && unitM3 > 0) totalVolumeM3 += unitM3 * quantity
    totalItems += quantity
    if (TYPE_ORDER[item.moveTypeMinimum] > TYPE_ORDER[highestMinType]) {
      highestMinType = item.moveTypeMinimum
    }

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

  // Custom items count by their size band, exactly as on the app and server.
  for (const custom of customItems) {
    if (custom.quantity <= 0) continue
    const size = customSize(custom.approxSize)
    totalItems += custom.quantity
    totalPoints += CUSTOM_SIZE_POINTS[size] * custom.quantity
    totalWeightKg += (custom.estimatedWeightKg ?? 0) * custom.quantity
    totalVolumeM3 += CUSTOM_SIZE_M3[size] * custom.quantity
    totalVolumeCm3 += CUSTOM_SIZE_M3[size] * 1_000_000 * custom.quantity
  }

  // Float noise from summing cm³ products must not tip a basket sitting
  // exactly on a limit (10 m³ is ≤ 10 m³).
  totalVolumeM3 = Math.round(totalVolumeM3 * 1e6) / 1e6
  // Three decimals, like the engine's loaded volume (lib/move-volume.ts).
  const loadedVolumeM3 = Math.round(totalVolumeM3 * thresholds.packingFactor * 1000) / 1000

  // Determine recommended type
  let recommendedType: MoveType = 'light'
  if (exceeds(thresholds.regular, totalPoints, totalWeightKg, totalItems, loadedVolumeM3)) {
    recommendedType = 'premium'
  } else if (exceeds(thresholds.light, totalPoints, totalWeightKg, totalItems, loadedVolumeM3)) {
    recommendedType = 'regular'
  }

  // Floor: any included item with a higher moveTypeMinimum lifts the
  // recommendation to at least that tier — a single piano forces premium
  // even though it doesn't exceed any threshold on its own.
  if (TYPE_ORDER[highestMinType] > TYPE_ORDER[recommendedType]) {
    recommendedType = highestMinType
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
    totalVolumeM3,
    loadedVolumeM3,
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
