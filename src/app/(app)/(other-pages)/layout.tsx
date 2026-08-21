import Header from '@/components/Header/Header'
import { ApplicationLayout } from '../application-layout'

// This layout deliberately exports no metadata.
//
// It used to override the root layout with Chisfis template copy: the title
// `Home` (which is why ~25 non-home routes — checkout, move-preview, every
// `(mover)` page — were all titled "Home"), a description of the *template*
// rather than the product, and the keywords `Travel`, `E-commerce`, `Cars`.
// Translating that into eight languages would have shipped it eight times over.
// Removing the override lets every page here inherit the root layout's real,
// localised title/description instead.

export default function Layout({ children, params }: { children: React.ReactNode; params: any }) {
  return <ApplicationLayout header={<Header hasBorderBottom={true} />}>{children}</ApplicationLayout>
}
