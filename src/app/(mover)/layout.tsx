import MoverDashboardLayout from './mover-dashboard-layout'
import { ReactNode } from 'react'
import MoveRequestPopup from '@/components/MoveRequestPopup'

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <MoveRequestPopup>
      <MoverDashboardLayout>{children}</MoverDashboardLayout>
    </MoveRequestPopup>
  )
}

export default Layout
