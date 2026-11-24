import type { Locale } from '@/lib/i18n-config'
import { LEGAL_UPDATED_AT } from './company'
import de from './content/de'
import en from './content/en'
import es from './content/es'
import fr from './content/fr'
import it from './content/it'
import nl from './content/nl'
import pl from './content/pl'
import tr from './content/tr'
import type { LegalContent } from './types'

/** The legal texts per language. German is the authoritative version. */
export const LEGAL_CONTENT: Record<Locale, LegalContent> = { de, en, es, fr, it, nl, pl, tr }

export const AUTHORITATIVE_LOCALE: Locale = 'de'

export function getLegalContent(locale: Locale): LegalContent {
  return LEGAL_CONTENT[locale] ?? LEGAL_CONTENT.en
}

/** "Last updated: 24 November 2026", in the reader's language. */
export function updatedLine(locale: Locale, isoDate: string = LEGAL_UPDATED_AT): string {
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  )
  return getLegalContent(locale).updatedLabel.replace('{{date}}', date)
}

export type { HelpDocument, ImprintDocument, LegalContent, LegalDocument, LegalSection } from './types'
