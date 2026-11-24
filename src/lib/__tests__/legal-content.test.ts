import { describe, expect, it } from 'vitest'
import { LOCALES } from '@/lib/i18n-config'
import { AUTHORITATIVE_LOCALE, LEGAL_CONTENT, getLegalContent, updatedLine } from '@/lib/legal'
import { COMPANY, missingImprintFacts, operatorName } from '@/lib/legal/company'
import type { LegalContent } from '@/lib/legal'

/** Every id and the size of every list, so two languages can be compared part by part. */
function shape(c: LegalContent) {
  const sections = (list: LegalContent['terms']['sections']) =>
    list.map((s) => [s.id, s.paragraphs?.length ?? 0, s.bullets?.length ?? 0, s.after?.length ?? 0])
  return {
    terms: [c.terms.intro.length, sections(c.terms.sections)],
    privacy: [c.privacy.intro.length, sections(c.privacy.sections)],
    help: [c.help.intro.length, c.help.groups.map((g) => [g.id, g.topics.map((t) => [t.id, t.answer.length])])],
    imprint: [c.imprint.intro.length, Object.keys(c.imprint.labels).sort(), sections(c.imprint.sections)],
  }
}

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out))
  return out
}

describe('legal pages content', () => {
  it('exists in all eight languages, German being the authoritative one', () => {
    expect(Object.keys(LEGAL_CONTENT).sort()).toEqual([...LOCALES].sort())
    expect(AUTHORITATIVE_LOCALE).toBe('de')
  })

  it.each(LOCALES.filter((l) => l !== 'en'))('%s has every part the English text has', (locale) => {
    expect(shape(getLegalContent(locale))).toEqual(shape(LEGAL_CONTENT.en))
  })

  it.each([...LOCALES])('%s has no empty text, no dash punctuation and no leftover token', (locale) => {
    const all = strings(getLegalContent(locale))
    expect(all.length).toBeGreaterThan(200)
    for (const s of all) {
      expect(s.trim().length).toBeGreaterThan(0)
      expect(s).not.toMatch(/—| – /)
      expect(s).not.toMatch(/\bTODO\b|lorem ipsum|being finalised/)
    }
    expect(all.filter((s) => s.includes('{{'))).toEqual([getLegalContent(locale).updatedLabel])
  })

  it.each([...LOCALES])('%s never presents the platform as the carrier', (locale) => {
    const text = strings(getLegalContent(locale)).join('\n')
    expect(text).not.toMatch(/our team|our movers|we move |unser team|unsere umzugs|nuestro equipo|notre équipe|nos déménageurs|il nostro team|ons team|onze verhuizers|nasz zespół|ekibimiz/i)
  })

  it('says what the platform does not offer, in the terms and in the help', () => {
    const { terms, help } = LEGAL_CONTENT.en
    expect(terms.sections.find((s) => s.id === 'scope')?.after?.join(' ')).toMatch(/Waste disposal, furniture assembly/)
    expect(help.groups.find((g) => g.id === 'booking')?.topics.find((t) => t.id === 'extras')?.answer.join(' ')).toMatch(
      /cannot be booked/,
    )
  })

  it('section ids are unique within a page', () => {
    for (const doc of [LEGAL_CONTENT.en.terms, LEGAL_CONTENT.en.privacy]) {
      const ids = doc.sections.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('formats the date for the language', () => {
    expect(updatedLine('en', '2026-11-24')).toBe('Last updated: November 24, 2026')
    expect(updatedLine('de', '2026-11-24')).toContain('24. November 2026')
  })
})

describe('company facts for the imprint', () => {
  it('falls back to the brand while the legal name is not entered', () => {
    expect(operatorName({ ...COMPANY, legalName: '' })).toBe('PickLte')
    expect(operatorName({ ...COMPANY, legalName: 'Example UG (haftungsbeschränkt)' })).toBe('Example UG (haftungsbeschränkt)')
  })

  it('reports which required facts are missing', () => {
    expect(missingImprintFacts({ ...COMPANY, legalName: '', addressLines: [], representedBy: '', email: '' })).toEqual([
      'legalName', 'addressLines', 'representedBy', 'email',
    ])
    expect(
      missingImprintFacts({ ...COMPANY, legalName: 'X UG', addressLines: ['Street 1', '10115 Berlin'], representedBy: 'A B', email: 'a@b.de' }),
    ).toEqual([])
  })
})
