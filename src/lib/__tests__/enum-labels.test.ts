/**
 * The stored-slug enums must reach the **catalog**, in every language.
 *
 * Every function under test replaces a page-local `formatLabel()` that split a
 * database slug on `_` and title-cased the words. That helper could only ever
 * emit English: `parkingSituation = 'at_building'` rendered "At Building" on
 * the German page exactly as on the English one, and no amount of translating
 * the surrounding label changed it, because the value never went through `t`
 * at all.
 *
 * So the assertions below are deliberately shaped as *"this is not the
 * title-cased slug"*: each one names the real German or Polish string from the
 * shipped catalog, and a regression to `formatLabel` fails them all. They run
 * against the real `src/locales/**` files rather than a fixture catalog — a
 * fixture would pass while the shipped catalog was missing the key, which is
 * the failure mode this whole pass exists to close.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createInstance, type TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'

import { ARRIVAL_WINDOW_SLUGS } from '../service-limits'
import {
  additionalServiceLabel,
  arrivalWindowLabel,
  arrivalWindowOptionLabel,
  dropoffParkingLabel,
  flexibilityLabel,
  floorLevelLabel,
  packingLevelLabel,
  parkingLabel,
  paymentMethodLabel,
  vehicleTypeLabel,
} from '../enum-labels'

const NAMESPACES = ['booking', 'common'] as const
const LOCALES = ['en', 'de', 'pl'] as const

function catalog(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, `../../locales/${locale}/${ns}.json`), 'utf8')
  ) as Record<string, unknown>
}

function tFor(lng: string): TFunction {
  const instance = createInstance()
  instance.init({
    lng,
    // No fallback: an English string coming back from a German lookup would
    // otherwise hide exactly the defect these tests are here to catch.
    fallbackLng: false,
    ns: [...NAMESPACES],
    defaultNS: 'booking',
    resources: Object.fromEntries(
      LOCALES.map((l) => [l, Object.fromEntries(NAMESPACES.map((ns) => [ns, catalog(l, ns)]))])
    ),
    interpolation: { escapeValue: false },
  })
  return instance.t
}

const en = tFor('en')
const de = tFor('de')
const pl = tFor('pl')

/** What the deleted `formatLabel` would have produced for a slug. */
const titleCased = (slug: string) =>
  slug
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

describe('parking', () => {
  it('renders the catalog phrase, not the slug', () => {
    expect(en(parkingLabel(en, 'at_building') as never)).toBeDefined()
    expect(parkingLabel(en, 'at_building')).toBe('Parking directly at building')
    expect(parkingLabel(de, 'at_building')).not.toBe(titleCased('at_building'))
    expect(parkingLabel(de, 'at_building')).toMatch(/Geb/)
    expect(parkingLabel(pl, 'no_parking')).not.toBe(titleCased('no_parking'))
    expect(parkingLabel(pl, 'no_parking')).not.toMatch(/^No Parking$/)
  })

  it('resolves the RN apps’ vocabulary too', () => {
    // pickltmobile writes these four into the same column.
    for (const slug of ['driveway', 'street', 'lot', 'none']) {
      expect(parkingLabel(de, slug)).not.toBe(titleCased(slug))
      expect(parkingLabel(de, slug)).not.toMatch(/^booking:/)
    }
  })

  it('keeps drop-off parking on its own five-value family', () => {
    expect(dropoffParkingLabel(en, 'street_only')).toBe('No parking / street only')
    expect(dropoffParkingLabel(de, 'street_only')).not.toBe(titleCased('street_only'))
    expect(dropoffParkingLabel(de, 'loading_zone')).not.toBe(titleCased('loading_zone'))
    // Pickup vocabulary on a drop-off row still resolves rather than showing a slug.
    expect(dropoffParkingLabel(de, 'no_parking')).toBe(parkingLabel(de, 'no_parking'))
  })
})

describe('floor level', () => {
  it('takes the ordinal from the formatter, not from a key per storey', () => {
    expect(floorLevelLabel(en, '1')).toBe('1st floor')
    expect(floorLevelLabel(en, '2')).toBe('2nd floor')
    expect(floorLevelLabel(en, '3')).toBe('3rd floor')
    expect(floorLevelLabel(en, '7')).toBe('7th floor')
    // German and Polish carry only `_other` — the pruned categories are inert
    // for them, and the number still comes from the formatter.
    expect(floorLevelLabel(de, '3')).toContain('3')
    expect(floorLevelLabel(de, '3')).not.toBe('3rd floor')
    expect(floorLevelLabel(pl, '3')).not.toBe('3rd floor')
  })

  it('gives the ground floor its own word', () => {
    expect(floorLevelLabel(en, 'ground')).toBe('Ground floor')
    expect(floorLevelLabel(de, 'ground')).not.toBe('Ground')
    expect(floorLevelLabel(de, 'ground')).toMatch(/geschoss|Erdgeschoss/i)
    // '0' is the ground floor, and is what the RN instant flow stores.
    expect(floorLevelLabel(de, '0')).toBe(floorLevelLabel(de, 'ground'))
  })

  it('accepts the RN slug forms', () => {
    expect(floorLevelLabel(en, 'floor_2')).toBe(floorLevelLabel(en, '2'))
    expect(floorLevelLabel(de, 'floor_5plus')).not.toBe(titleCased('floor_5plus'))
  })
})

describe('arrival window', () => {
  it('translates the named windows', () => {
    expect(arrivalWindowLabel(en, 'morning')).toContain('Morning')
    expect(arrivalWindowLabel(de, 'morning')).not.toContain('Morning')
    expect(arrivalWindowLabel(pl, 'evening')).not.toContain('Evening')
  })

  /**
   * The regression this whole pass exists for. `Morning (8am-12pm)` shipped an
   * **English 12-hour clock inside a translated value**, and all seven
   * translators independently rewrote it to 24-hour — so one time pattern lived
   * in eight catalogs and disagreed with itself. The hours are now
   * `ARRIVAL_WINDOW_HOURS`; the clock convention is the locale's.
   */
  it('formats the window hours instead of baking a 12-hour clock', () => {
    // No catalog value may contain am/pm — in any locale.
    for (const t of [en, de, pl]) {
      for (const slug of ARRIVAL_WINDOW_SLUGS) {
        expect(t(`booking:arrivalWindow.${slug}.label`)).not.toMatch(/\d\s*(am|pm)/i)
        expect(t(`booking:arrivalWindow.${slug}.label`)).not.toMatch(/\d/)
      }
    }
    // English keeps its own 12-hour convention…
    expect(arrivalWindowOptionLabel(en, 'morning', 'en')).toMatch(/8[:.]00\s*(AM|am)/)
    // …while German renders the same two numbers on a 24-hour clock, from the
    // same `[8, 12]` pair, with no German catalog value involved.
    const deMorning = arrivalWindowOptionLabel(de, 'morning', 'de')
    expect(deMorning).toContain('Vormittag')
    expect(deMorning).toMatch(/08[:.]00/)
    expect(deMorning).not.toMatch(/am|pm/i)
  })

  it('translates the instant-move sentinel', () => {
    expect(arrivalWindowLabel(en, 'now')).toBe('Now')
    // `formatLabel` produced the English word "Now" in every language.
    expect(arrivalWindowLabel(de, 'now')).not.toBe('Now')
    expect(arrivalWindowLabel(pl, 'now')).not.toBe('Now')
  })

  it('formats a stored clock time instead of translating it', () => {
    // The booking wizard stores "08:00". A time is data: it goes through the
    // locale formatter and must never be frozen into a catalog value.
    const value = arrivalWindowLabel(de, '08:00')
    expect(value).toMatch(/08/)
    expect(value).not.toMatch(/^booking:/)
  })
})

describe('the remaining closed enums', () => {
  it('vehicle type', () => {
    expect(vehicleTypeLabel(en, 'small_van')).toBe('Small Van')
    expect(vehicleTypeLabel(de, 'small_van')).not.toBe(titleCased('small_van'))
    expect(vehicleTypeLabel(pl, 'large_truck')).not.toBe(titleCased('large_truck'))
  })

  it('packing service level', () => {
    expect(packingLevelLabel(en, 'unpacking')).toBe('Pack and unpack')
    expect(packingLevelLabel(de, 'unpacking')).not.toBe('Unpacking')
    expect(packingLevelLabel(pl, 'partial')).not.toBe('Partial')
  })

  it('flexibility', () => {
    expect(flexibilityLabel(en, 'not_flexible')).toBe('Not flexible')
    expect(flexibilityLabel(de, 'not_flexible')).not.toBe(titleCased('not_flexible'))
    expect(flexibilityLabel(pl, 'flexible_1hr')).not.toBe(titleCased('flexible_1hr'))
  })

  it('payment method, across the three key families it spans', () => {
    expect(paymentMethodLabel(en, 'cash')).toBe('Cash')
    expect(paymentMethodLabel(en, 'bank_transfer')).toBe('Bank transfer')
    expect(paymentMethodLabel(de, 'cash')).not.toBe('Cash')
    expect(paymentMethodLabel(de, 'bank_transfer')).not.toBe(titleCased('bank_transfer'))
    // PayPal is a brand name and is identical everywhere — that is the catalog
    // saying so, not a missed translation.
    expect(paymentMethodLabel(de, 'paypal')).toBe('PayPal')
  })

  it('additional services', () => {
    expect(additionalServiceLabel(en, 'furniture_disassembly')).toBe('Furniture disassembly')
    expect(additionalServiceLabel(de, 'furniture_disassembly')).toBe('Möbeldemontage')
    expect(additionalServiceLabel(pl, 'moveout_cleaning')).toBe('Sprzątanie po wyprowadzce')
    // `disposal_entsorgung` is the one slug whose key segment is not its camel form.
    expect(additionalServiceLabel(de, 'disposal_entsorgung')).toBe('Entsorgung')
  })
})

describe('values the resolvers must not invent a translation for', () => {
  it('renders an unknown slug as itself rather than as title-cased English', () => {
    expect(vehicleTypeLabel(de, 'hover_barge')).toBe('hover_barge')
    expect(parkingLabel(de, 'roof_helipad')).toBe('roof_helipad')
    // A user-typed custom material has no slug and is the user's own words.
    expect(additionalServiceLabel(de, 'Grandfather clock')).toBe('Grandfather clock')
  })

  it('renders a missing value as the shared “not specified” phrase', () => {
    expect(vehicleTypeLabel(en, null)).toBe('Not specified')
    expect(vehicleTypeLabel(de, null)).not.toBe('Not specified')
    expect(floorLevelLabel(de, '')).not.toBe('Not specified')
  })
})

describe('no resolver leaks a raw key', () => {
  it('never returns an unresolved “namespace:key” string', () => {
    const calls: string[] = [
      parkingLabel(de, 'at_building'),
      parkingLabel(de, 'nearby'),
      parkingLabel(de, 'no_parking'),
      dropoffParkingLabel(de, 'directly_in_front'),
      dropoffParkingLabel(de, 'limited'),
      dropoffParkingLabel(de, 'underground'),
      dropoffParkingLabel(de, 'loading_zone'),
      floorLevelLabel(de, 'ground'),
      floorLevelLabel(de, '5'),
      arrivalWindowLabel(de, 'afternoon'),
      arrivalWindowLabel(de, 'now'),
      vehicleTypeLabel(de, 'medium_truck'),
      vehicleTypeLabel(de, 'multiple'),
      packingLevelLabel(de, 'none'),
      packingLevelLabel(de, 'full'),
      flexibilityLabel(de, 'flexible_1hr'),
      paymentMethodLabel(de, 'card'),
      additionalServiceLabel(de, 'temporary_storage'),
      additionalServiceLabel(de, 'tv_mount_remove'),
      additionalServiceLabel(de, 'appliance_connect'),
    ]
    for (const value of calls) {
      expect(value).not.toMatch(/^(booking|common):/)
      expect(value.length).toBeGreaterThan(0)
    }
  })
})
