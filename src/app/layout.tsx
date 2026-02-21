import '@/styles/tailwind.css'
import { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import 'rc-slider/assets/index.css'
import CustomizeControl from './customize-control'
import ThemeProvider from './theme-provider'
import MoveSearchProvider from '@/context/moveSearch'
import { AuthProvider } from '@/context/auth'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.className}>
      <body className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        <ThemeProvider>
          <div>
            <AuthProvider>
              <MoveSearchProvider>{children}</MoveSearchProvider>
            </AuthProvider>
            {/* <CustomizeControl /> */}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
