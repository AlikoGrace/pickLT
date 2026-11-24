import { LegalContents, LegalSections, LegalShell } from '@/components/legal/LegalPage'
import { resolveLocale } from '@/lib/i18n-server'
import { AUTHORITATIVE_LOCALE, getLegalContent, updatedLine } from '@/lib/legal'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const doc = getLegalContent(await resolveLocale()).privacy
  return { title: doc.title, description: doc.intro[0] }
}

export default async function PagePrivacy() {
  const locale = await resolveLocale()
  const content = getLegalContent(locale)
  const doc = content.privacy

  return (
    <LegalShell
      title={doc.title}
      updated={updatedLine(locale)}
      intro={doc.intro}
      notice={locale === AUTHORITATIVE_LOCALE ? null : content.languageNotice}
    >
      <LegalContents label={content.contentsLabel} items={doc.sections} />
      <LegalSections sections={doc.sections} />
    </LegalShell>
  )
}
