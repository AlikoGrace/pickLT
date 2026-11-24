import { LegalContents, LegalShell } from '@/components/legal/LegalPage'
import { resolveLocale } from '@/lib/i18n-server'
import { AUTHORITATIVE_LOCALE, getLegalContent, updatedLine } from '@/lib/legal'
import type { Metadata } from 'next'
import Link from 'next/link'

export async function generateMetadata(): Promise<Metadata> {
  const doc = getLegalContent(await resolveLocale()).help
  return { title: doc.title, description: doc.intro[0] }
}

export default async function PageHelp() {
  const locale = await resolveLocale()
  const content = getLegalContent(locale)
  const doc = content.help

  return (
    <LegalShell
      title={doc.title}
      updated={updatedLine(locale)}
      intro={doc.intro}
      notice={locale === AUTHORITATIVE_LOCALE ? null : content.languageNotice}
    >
      <LegalContents label={content.contentsLabel} items={doc.groups} />

      <div className="mt-10 space-y-12">
        {doc.groups.map((group) => (
          <section key={group.id} id={group.id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold">{group.heading}</h2>
            <div className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {group.topics.map((topic) => (
                <details key={topic.id} id={`${group.id}-${topic.id}`} className="group py-4">
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="flex items-start justify-between gap-4">
                      {topic.question}
                      <span aria-hidden className="text-neutral-400 transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <div className="mt-3 space-y-3 text-neutral-700 dark:text-neutral-300">
                    {topic.answer.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/terms" className="text-primary-600 hover:underline">
          {content.nav.terms}
        </Link>
        <Link href="/privacy" className="text-primary-600 hover:underline">
          {content.nav.privacy}
        </Link>
        <Link href="/imprint" className="text-primary-600 hover:underline">
          {content.nav.imprint}
        </Link>
      </p>
    </LegalShell>
  )
}
