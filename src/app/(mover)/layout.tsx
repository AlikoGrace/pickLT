import MoverDashboardLayout from './mover-dashboard-layout'
import { ReactNode } from 'react'

const Layout = ({ children }: { children: ReactNode }) => {
  return <MoverDashboardLayout>{children}</MoverDashboardLayout>
}

export default Layout
