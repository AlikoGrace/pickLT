import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * No page, component or route may name the euro itself (plan
 * `currency/0.master.md` W2/W3). Money is formatted by `formatMoney` in the
 * currency of the move (`moveCurrency(move)`, `breakdown.currency`), of the
 * ledger row, or of the signed-in user's market; a route writes the move's or
 * the ledger's currency. A literal `'EUR'`, `'eur'` or `€` in `src/app` or
 * `src/components` is a price that would be wrong in the next market.
 *
 * Comments are ignored (they may explain history). Heroicons' euro glyph
 * (`CurrencyEuroIcon`) is an icon name, not a formatted amount, and does not
 * match. The template's inert currency list lives in `src/data/navigation.ts`,
 * outside the scanned folders.
 */
const SRC = path.resolve(__dirname, '../..')
const ROOTS = ['app', 'components']

/** Files allowed to name the euro. Empty on purpose: add a path with the reason, or fix the file. */
const ALLOWED: Record<string, string> = {}

const LITERAL = /€|&euro;|(['"`])(EUR|eur)\1/

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') sourceFiles(full, out)
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

/** Block and line comments blanked out, line numbers kept. A `//` inside a string or URL is left alone. */
export function stripComments(source: string): string {
  const noBlocks = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  return noBlocks
    .split('\n')
    .map((line) => line.replace(/(^|[^:'"`\w/])\/\/.*$/, '$1'))
    .join('\n')
}

function offences(source: string): number[] {
  return stripComments(source)
    .split('\n')
    .flatMap((line, i) => (LITERAL.test(line) ? [i + 1] : []))
}

describe('no hard-coded euro in pages, components or routes', () => {
  it('the scanner sees a literal and ignores comments and icon names', () => {
    expect(offences("const a = `€${n.toFixed(2)}`")).toEqual([1])
    expect(offences("row.currency = 'EUR'\ncurrency: \"eur\",")).toEqual([1, 2])
    expect(offences("// was 'EUR'\n/* € per km */\n{/* (€ per km) */}\nimport { CurrencyEuroIcon } from 'x'")).toEqual([])
    expect(offences("fetch('https://x.test/a') // 'EUR'")).toEqual([])
  })

  it('finds none outside the allow-list', () => {
    const files = ROOTS.flatMap((root) => sourceFiles(path.join(SRC, root)))
    expect(files.length).toBeGreaterThan(100)
    const found: string[] = []
    for (const file of files) {
      const rel = path.relative(SRC, file).split(path.sep).join('/')
      if (rel in ALLOWED) continue
      for (const line of offences(fs.readFileSync(file, 'utf8'))) found.push(`${rel}:${line}`)
    }
    expect(found, `use formatMoney with the move's, the ledger's or the user's currency:\n${found.join('\n')}`).toEqual([])
  })

  it('every allow-listed file still exists and still needs its entry', () => {
    for (const rel of Object.keys(ALLOWED)) {
      const file = path.join(SRC, rel)
      expect(fs.existsSync(file), `${rel} is gone: remove it from ALLOWED`).toBe(true)
      expect(offences(fs.readFileSync(file, 'utf8')).length, `${rel} no longer names the euro: remove it from ALLOWED`).toBeGreaterThan(0)
    }
  })
})
