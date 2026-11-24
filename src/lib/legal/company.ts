/**
 * The operator of the platform, as shown in the imprint (`/imprint`) and named
 * as the controller in the privacy policy.
 *
 * These are facts about the company, not copy: they are the same in every
 * language and only the owner can supply them. A value left empty is not
 * printed, so nothing invented ever appears on the page. German law (section 5
 * DDG) requires the legal name, a postal address, a fast contact channel
 * (email) and, once they exist, the register entry and the VAT ID.
 */

export interface Company {
  /** Brand shown to users. */
  brand: string
  /** Full legal name including the legal form, e.g. "Example UG (haftungsbeschränkt)". */
  legalName: string
  /** Postal address, one entry per line. */
  addressLines: string[]
  /** Managing director(s) or owner. */
  representedBy: string
  email: string
  phone: string
  /** Register court and number, e.g. "Amtsgericht Charlottenburg, HRB 000000 B". */
  register: string
  /** VAT identification number under section 27a UStG. */
  vatId: string
  /** Person responsible for the content under section 18 (2) MStV, with address if it differs. */
  responsibleForContent: string
}

export const COMPANY: Company = {
  brand: 'PickLte',
  legalName: '',
  addressLines: [],
  representedBy: '',
  email: '',
  phone: '',
  register: '',
  vatId: '',
  responsibleForContent: '',
}

/** The name to use for the operator in running text. */
export function operatorName(company: Company = COMPANY): string {
  return company.legalName.trim() || company.brand
}

/** The imprint facts the law requires that are still empty. */
export function missingImprintFacts(company: Company = COMPANY): (keyof Company)[] {
  const required: (keyof Company)[] = ['legalName', 'addressLines', 'representedBy', 'email']
  return required.filter((key) => {
    const value = company[key]
    return Array.isArray(value) ? value.length === 0 : !String(value).trim()
  })
}

/** Date the legal texts were last changed (ISO, formatted per language at render). */
export const LEGAL_UPDATED_AT = '2026-11-24'
