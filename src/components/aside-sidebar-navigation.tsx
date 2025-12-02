import { getCurrencies, getLanguages, getNavigation } from '@/data/navigation'
import SidebarNavigation from './Header/Navigation/SidebarNavigation'
import Aside from './aside'

interface Props {
  className?: string
}

const AsideSidebarNavigation = async ({ className }: Props) => {
  const navigationMenu = await getNavigation()
  const currencies = await getCurrencies()
  const languages = await getLanguages()

  return (
    <Aside openFrom="right" type="sidebar-navigation" logoOnHeading contentMaxWidthClassName="max-w-md">
      <div className="flex h-full flex-col">
        <div className="hidden-scrollbar flex-1 overflow-x-hidden overflow-y-auto py-6">
          <SidebarNavigation data={navigationMenu} currencies={currencies} languages={languages} />
        </div>
      </div>
    </Aside>
  )
}

export default AsideSidebarNavigation
