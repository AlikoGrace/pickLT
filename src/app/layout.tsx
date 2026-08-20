import '@/styles/tailwind.css'
import { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import 'rc-slider/assets/index.css'
import CustomizeControl from './customize-control'
import ThemeProvider from './theme-provider'
import MoveSearchProvider from '@/context/moveSearch'
import { AuthProvider } from '@/context/auth'
import I18nProvider from './i18n-provider'
import { getResources } from '@/lib/i18n-catalog'
import { resolveLocale } from '@/lib/i18n-server'

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    template: '%s - PickLT',
    default: 'PickLT - Move smarter with PickLT',
  },
  description: 'PickLT - Your trusted moving service platform',
  keywords: ['PickLT', 'Moving', 'Movers', 'Relocation', 'Umzug'],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Cookie -> Accept-Language -> 'en'. No `[locale]` URL segment (decision D5).
  // Reading the request makes rendering dynamic, which every route here already
  // is: src/middleware.ts runs on all of them.
  const locale = await resolveLocale()

  // All 8 locales are Latin script and LTR, so there is deliberately no `dir`.
  return (
    <html lang={locale} className={poppins.className}>
      <body className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        <ThemeProvider>
          <div>
            <I18nProvider locale={locale} resources={getResources(locale)}>
              <AuthProvider>
                <MoveSearchProvider>{children}</MoveSearchProvider>
              </AuthProvider>
              <CustomizeControl />
            </I18nProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
