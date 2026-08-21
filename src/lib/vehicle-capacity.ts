/**
 * The capacity band each vehicle class advertises.
 *
 * These three numbers used to live in the catalog — `booking:vehicle.smallVan.capacity`
 * read `"Up to 10 m³"`, `mediumTruck` `"10–25 m³"`, `largeTruck` `"25+ m³"` — which
 * put a **business constant in eight JSON files per string**, twenty-four values that
 * had to be re-translated to change a threshold, plus a unit symbol and a range
 * separator that no translator can be expected to get right (Spanish, Italian and
 * Dutch use a hyphen where German and Polish use an en dash; `Intl` knows, a
 * translator does not).
 *
 * So the band is data here, the unit and separator come from `lib/format.ts`, and
 * the catalog keeps only the word — `"Up to {{capacity}}"` and the three blurbs.
 *
 * `null` means the band is open at that end. Kept byte-compatible with
 * `pickltmover/lib/vehicle-capacity.ts`, which advertises the same three classes to
 * the driver.
 */

import type { TFunction } from 'i18next'

import { formatVolumeAtLeastM3, formatVolumeM3, formatVolumeRangeM3 } from './format'

/** Catalog key segments for the three classes; the wire values are `small_van` &c. */
export type VehicleTierKey = 'smallVan' | 'mediumTruck' | 'largeTruck'

export const VEHICLE_CAPACITY_M3: Record<VehicleTierKey, { min: number | null; max: number | null }> = {
  smallVan: { min: null, max: 10 },
  mediumTruck: { min: 10, max: 25 },
  largeTruck: { min: 25, max: null },
}

/**
 * The capacity band as one rendered string: `Up to 10 m³` / `10–25 m³` / `25+ m³`,
 * each in the reader's locale.
 */
// i18n-keys: booking:vehicle.capacity.upTo.value
export function vehicleCapacityLabel(t: TFunction, tier: VehicleTierKey): string {
  const { min, max } = VEHICLE_CAPACITY_M3[tier]
  if (min == null && max != null) {
    return t('booking:vehicle.capacity.upTo.value', { capacity: formatVolumeM3(max) })
  }
  if (min != null && max != null) return formatVolumeRangeM3(min, max)
  return formatVolumeAtLeastM3(min)
}
