import Header from '@/components/Header/Header'
import { ApplicationLayout } from '../application-layout'

export default function Layout({ children, params }: { children: React.ReactNode; params: any }) {
  return <ApplicationLayout header={<Header hasBorderBottom={false} />}>{children}</ApplicationLayout>
}
