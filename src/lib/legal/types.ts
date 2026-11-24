/**
 * Shape of the public legal pages (`/terms`, `/privacy`, `/help`, `/imprint`).
 *
 * The text lives in one typed module per language under `./content/` rather
 * than in the i18n catalog: it is long, it is only ever rendered on the server,
 * and the compiler then guarantees every language has every part.
 *
 * Section and topic `id`s are stable anchors (`/terms#payment`). They are never
 * translated.
 */

export interface LegalSection {
  id: string
  heading: string
  /** Paragraphs shown before the list. */
  paragraphs?: string[]
  /** A bullet list. */
  bullets?: string[]
  /** Paragraphs shown after the list. */
  after?: string[]
}

export interface LegalDocument {
  title: string
  /** One or two opening paragraphs under the title. */
  intro: string[]
  sections: LegalSection[]
}

export interface HelpTopic {
  id: string
  question: string
  answer: string[]
}

export interface HelpGroup {
  id: string
  heading: string
  topics: HelpTopic[]
}

export interface HelpDocument {
  title: string
  intro: string[]
  groups: HelpGroup[]
}

export interface ImprintDocument {
  title: string
  intro: string[]
  /** Labels of the company facts, which come from `./company.ts`. */
  labels: {
    provider: string
    address: string
    representedBy: string
    contact: string
    email: string
    phone: string
    register: string
    vatId: string
    responsibleForContent: string
  }
  sections: LegalSection[]
}

export interface LegalContent {
  /** "Last updated: {{date}}"; the date is formatted for the language at render. */
  updatedLabel: string
  /** Shown at the foot of every page in a language other than German. */
  languageNotice: string
  /** Heading of the list of sections at the top of a long page. */
  contentsLabel: string
  /** Link labels used in the footer and between the pages. */
  nav: {
    terms: string
    privacy: string
    help: string
    imprint: string
  }
  terms: LegalDocument
  privacy: LegalDocument
  help: HelpDocument
  imprint: ImprintDocument
}
