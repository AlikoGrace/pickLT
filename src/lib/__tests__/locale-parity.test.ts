/**
 * Catalog parity — the single most valuable test in the i18n effort
 * (`.agent/plans/i18n/4.catalog-conventions.md` §6).
 *
 * Against `en` as the reference, for all eight locales:
 *   1. same key set — missing AND orphaned keys both fail, and the failure
 *      names the keys;
 *   2. no empty values — `""` is the shape a half-finished translation takes,
 *      and it renders as a blank region rather than as an obvious bug;
 *   3. placeholder parity — the `{{…}}` set must match `en` exactly; a dropped
 *      `{{count}}` ships a sentence with a hole, a renamed one ships the
 *      literal text `{{anzahl}}`;
 *   4. plural categories — every required CLDR category present for every
 *      plural key.
 *
 * It passes trivially on empty catalogs, which is correct: this is a ratchet
 * that tightens as extraction lands, not a gate on starting.
 *
 * Reading the catalogs off disk rather than importing `@/lib/i18n-catalog` is
 * deliberate — a file that exists but is missing from the hand-maintained
 * import list in that module is exactly the drift worth catching, and §5 below
 * asserts the two agree.
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALES, NAMESPACES, type Locale } from '../i18n-config'

/**
 * The catalog root. `src/locales`, not `public/locales` and not the repo root:
 * the bundler should own and fingerprint it, nothing should be able to fetch
 * the whole catalog as a static asset, and `scripts/sync-locales.ts` in
 * pickltmobile writes to exactly this path (its `TARGETS` entry for this repo
 * is `dir: 'src/locales'`). If this constant ever has to change, that script —
 * owned by another repo — has to change with it.
 */
const CATALOG_ROOT = path.resolve(__dirname, '../../locales')

/**
 * From §4. Recorded here as a decision rather than derived from
 * `Intl.PluralRules`, so it does not silently change when Node updates CLDR.
 *
 * CLDR 43 added a `many` category to fr/es/it that exists only for
 * compact-notation millions ("1 million de colis"). No count in this product
 * reaches it, so it is optional-but-permitted rather than required.
 */
const REQUIRED_PLURAL_CATEGORIES: Record<Locale, string[]> = {
  en: ['one', 'other'],
  de: ['one', 'other'],
  nl: ['one', 'other'],
  tr: ['one', 'other'],
  fr: ['one', 'other'],
  es: ['one', 'other'],
  it: ['one', 'other'],
  pl: ['one', 'few', 'many', 'other'],
}

/** i18next reserves `_<category>`; everything else is a plain key. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

type Flat = Record<string, string>

function flatten(value: unknown, prefix = '', out: Flat = {}): Flat {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out)
    }
  } else if (prefix) {
    out[prefix] = typeof value === 'string' ? value : JSON.stringify(value)
  }
  return out
}

function readCatalog(locale: string, ns: string): Flat {
  const file = path.join(CATALOG_ROOT, locale, `${ns}.json`)
  if (!fs.existsSync(file)) throw new Error(`missing catalog file: ${locale}/${ns}.json`)
  return flatten(JSON.parse(fs.readFileSync(file, 'utf8')))
}

/** `{{name}}` and `{{ name, format }}` alike — the name is what must match. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{\s*([^},\s]+)/g)].map((m) => m[1]).sort()
}

/** `itemCount_one` -> `itemCount`; a non-plural key maps to itself. */
function pluralBase(key: string): string | null {
  return PLURAL_SUFFIX.test(key) ? key.replace(PLURAL_SUFFIX, '') : null
}

const OTHER_LOCALES = LOCALES.filter((l) => l !== DEFAULT_LOCALE)

describe('locale catalogs', () => {
  it('has a directory for every locale and nothing else', () => {
    const dirs = fs
      .readdirSync(CATALOG_ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
    expect(dirs).toEqual([...LOCALES].sort())
  })

  it.each(LOCALES)('%s holds exactly the declared namespaces', (locale) => {
    const files = fs
      .readdirSync(path.join(CATALOG_ROOT, locale))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .sort()
    // An extra file here is either another repo's app namespace (which
    // sync-locales refuses to write and this test would never check) or a
    // namespace nobody added to i18n-config.
    expect(files).toEqual([...NAMESPACES].sort())
  })

  it('is valid JSON everywhere', () => {
    for (const locale of LOCALES) for (const ns of NAMESPACES) expect(() => readCatalog(locale, ns)).not.toThrow()
  })
})

describe.each(NAMESPACES)('%s.json', (ns) => {
  const reference = readCatalog(DEFAULT_LOCALE, ns)
  const referenceKeys = Object.keys(reference).sort()

  it.each(OTHER_LOCALES)(`%s has the same key set as ${DEFAULT_LOCALE}`, (locale) => {
    const actual = readCatalog(locale, ns)

    // Plural keys are the one legitimate asymmetry: Polish needs `_few` and
    // `_many` forms English has no counterpart for, and English may carry an
    // `_one`/`_other` pair where the target language needs a different set.
    // Compare plural families by base key and singular keys exactly.
    const base = (keys: string[]) => [...new Set(keys.map((k) => pluralBase(k) ?? k))].sort()

    const missing = base(referenceKeys).filter((k) => !base(Object.keys(actual)).includes(k))
    const orphaned = base(Object.keys(actual)).filter((k) => !base(referenceKeys).includes(k))

    expect({ missing, orphaned }).toEqual({ missing: [], orphaned: [] })
  })

  it.each(LOCALES)('%s has no empty values', (locale) => {
    const empties = Object.entries(readCatalog(locale, ns))
      .filter(([, v]) => v.trim() === '')
      .map(([k]) => k)
    expect(empties).toEqual([])
  })

  it.each(OTHER_LOCALES)('%s preserves every interpolation placeholder', (locale) => {
    const actual = readCatalog(locale, ns)
    const mismatches: { key: string; expected: string[]; actual: string[] }[] = []

    for (const [key, value] of Object.entries(actual)) {
      // Compare against the same key, or against the plural family's `_other`
      // form when this locale has a category `en` does not.
      const ref = reference[key] ?? reference[`${pluralBase(key)}_other`]
      if (ref === undefined) continue
      const expected = placeholders(ref)
      const got = placeholders(value)
      if (JSON.stringify(expected) !== JSON.stringify(got)) {
        mismatches.push({ key, expected, actual: got })
      }
    }
    expect(mismatches).toEqual([])
  })

  it.each(LOCALES)('%s supplies every required plural category', (locale) => {
    const keys = Object.keys(readCatalog(locale, ns))
    const families = new Map<string, Set<string>>()

    for (const key of keys) {
      const b = pluralBase(key)
      if (!b) continue
      const category = key.slice(b.length + 1)
      // `_zero` is an explicit override i18next honours in every locale; it is
      // never *required*, so it does not count towards the required set.
      if (category === 'zero') continue
      if (!families.has(b)) families.set(b, new Set())
      families.get(b)!.add(category)
    }

    // Ordinal families (`…_ordinal_two`) select on the ordinal rule set, not the
    // cardinal one this table pins. English ordinals genuinely use one/two/few/other
    // (1st, 2nd, 3rd, 4th) while English cardinals use one/other, and German ordinals
    // use `other` alone — so judging one by the other's table both demands forms that
    // can never render and rejects forms that must. Cardinals stay pinned by hand
    // (conventions §4); ordinals only need their `other` fallback to exist.
    const incomplete: { key: string; missing: string[] }[] = []
    for (const [b, categories] of families) {
      const required = b.endsWith('_ordinal') ? ['other'] : REQUIRED_PLURAL_CATEGORIES[locale]
      const missing = required.filter((c) => !categories.has(c))
      if (missing.length) incomplete.push({ key: b, missing })
    }
    expect(incomplete).toEqual([])
  })
})

describe('i18n-catalog module', () => {
  it('imports every file on disk', async () => {
    // Guards the hand-maintained import list in src/lib/i18n-catalog.ts: a
    // namespace added to disk but not to that module is invisible at runtime
    // and would otherwise only surface as a missingKey in production.
    const { getAllResources } = await import('../i18n-catalog')
    const resources = getAllResources() as Record<string, Record<string, unknown>>
    expect(Object.keys(resources).sort()).toEqual([...LOCALES].sort())
    for (const locale of LOCALES) {
      expect(Object.keys(resources[locale]).sort()).toEqual([...NAMESPACES].sort())
    }
  })
})
