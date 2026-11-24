import type { ReactNode } from 'react'
import type { LegalSection } from '@/lib/legal'

/**
 * Layout shared by the public legal pages (`/terms`, `/privacy`, `/help`,
 * `/imprint`). Server-rendered; the text comes from `src/lib/legal/content`.
 */

export function LegalShell({
  title,
  updated,
  intro,
  notice,
  children,
}: {
  title: string
  updated: string
  intro: string[]
  /** Shown at the foot when the page is not in the authoritative language. */
  notice?: string | null
  children: ReactNode
}) {
  return (
    <div className="container py-12 sm:py-16 lg:py-20">
      <article className="mx-auto max-w-3xl">
        <header>
          <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{updated}</p>
          <div className="mt-6 space-y-4 text-neutral-700 dark:text-neutral-300">
            {intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </header>
        {children}
        {notice ? (
          <p className="mt-12 border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            {notice}
          </p>
        ) : null}
      </article>
    </div>
  )
}

export function LegalContents({ label, items }: { label: string; items: { id: string; heading: string }[] }) {
  return (
    <nav aria-label={label} className="mt-8 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
      <h2 className="text-sm font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">{label}</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="text-primary-600 hover:underline">
              {item.heading}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="mt-10 space-y-10">
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24">
          <h2 className="text-xl font-semibold">{section.heading}</h2>
          <div className="mt-3 space-y-3 text-neutral-700 dark:text-neutral-300">
            {section.paragraphs?.map((p, i) => <p key={`p${i}`}>{p}</p>)}
            {section.bullets?.length ? (
              <ul className="list-disc space-y-2 ps-5">
                {section.bullets.map((b, i) => (
                  <li key={`b${i}`}>{b}</li>
                ))}
              </ul>
            ) : null}
            {section.after?.map((p, i) => <p key={`a${i}`}>{p}</p>)}
          </div>
        </section>
      ))}
    </div>
  )
}
