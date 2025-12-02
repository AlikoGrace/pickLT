import React, { FC } from 'react'
import { ApplicationLayout } from '../(app)/application-layout'
import { PageNavigation } from './PageNavigation'

interface Props {
  children?: React.ReactNode
}

const Layout: FC<Props> = ({ children }) => {
  return (
    <ApplicationLayout>
      <div className="bg-neutral-50 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 bg-white pt-12 dark:border-neutral-700 dark:bg-neutral-800">
          <PageNavigation />
        </div>
        <div className="container pt-14 pb-24 sm:pt-16 lg:pb-32">{children}</div>
      </div>
    </ApplicationLayout>
  )
}

export default Layout
