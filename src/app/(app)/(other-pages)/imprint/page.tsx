import { LegalSections, LegalShell } from '@/components/legal/LegalPage'
import { resolveLocale } from '@/lib/i18n-server'
import { AUTHORITATIVE_LOCALE, getLegalContent, updatedLine } from '@/lib/legal'
import { COMPANY, operatorName } from '@/lib/legal/company'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const doc = getLegalContent(await resolveLocale()).imprint
  return { title: doc.title, description: doc.intro[0] }
}

export default async function PageImprint() {
  const locale = await resolveLocale()
  const content = getLegalContent(locale)
  const doc = content.imprint
  const l = doc.labels

  // Company facts are the same in every language. An empty one is not printed.
  const rows: { label: string; lines: string[]; href?: string }[] = [
    { label: l.provider, lines: [operatorName()] },
    { label: l.address, lines: COMPANY.addressLines },
    { label: l.representedBy, lines: [COMPANY.representedBy] },
    { label: l.email, lines: [COMPANY.email], href: COMPANY.email ? `mailto:${COMPANY.email}` : undefined },
    { label: l.phone, lines: [COMPANY.phone] },
    { label: l.register, lines: [COMPANY.register] },
    { label: l.vatId, lines: [COMPANY.vatId] },
    { label: l.responsibleForContent, lines: [COMPANY.responsibleForContent] },
  ]
    .map((row) => ({ ...row, lines: row.lines.map((line) => line.trim()).filter(Boolean) }))
    .filter((row) => row.lines.length > 0)

  return (
    <LegalShell
      title={doc.title}
      updated={updatedLine(locale)}
      intro={doc.intro}
      notice={locale === AUTHORITATIVE_LOCALE ? null : content.languageNotice}
    >
      <dl className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{row.label}</dt>
            <dd className="sm:col-span-2">
              {row.lines.map((line, i) =>
                row.href ? (
                  <a key={i} href={row.href} className="block text-primary-600 hover:underline">
                    {line}
                  </a>
                ) : (
                  <span key={i} className="block">
                    {line}
                  </span>
                ),
              )}
            </dd>
          </div>
        ))}
      </dl>
      <LegalSections sections={doc.sections} />
    </LegalShell>
  )
}
