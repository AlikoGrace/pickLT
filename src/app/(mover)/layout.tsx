import MoverDashboardLayout from './mover-dashboard-layout'
import { ReactNode } from 'react'
import MoveRequestPopup from '@/components/MoveRequestPopup'
import NotificationWrapper from '@/components/NotificationWrapper'

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <NotificationWrapper role="mover">
      <MoveRequestPopup>
        <MoverDashboardLayout>{children}</MoverDashboardLayout>
      </MoveRequestPopup>
    </NotificationWrapper>
  )
}

export default Layout
