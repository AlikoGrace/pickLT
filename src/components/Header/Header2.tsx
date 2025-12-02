import { getStayCategories } from '@/data/categories'
import { getCurrencies, getLanguages, getNavigation } from '@/data/navigation'
import Logo from '@/shared/Logo'
import clsx from 'clsx'
import { FC } from 'react'
import AvatarDropdown from './AvatarDropdown'
import CurrLangDropdown from './CurrLangDropdown'
import HamburgerBtnMenu from './HamburgerBtnMenu'
import Navigation from './Navigation/Navigation'
import NotifyDropdown from './NotifyDropdown'

interface Props {
  hasBorder?: boolean
  className?: string
}

const Header2: FC<Props> = async ({ hasBorder = true, className }) => {
  const navigationMenu = await getNavigation()
  const featuredCategory = (await getStayCategories())[7]
  const currencies = await getCurrencies()
  const languages = await getLanguages()

  return (
    <div className={clsx('relative', className)}>
      <div
        className={clsx(
          'relative border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
          hasBorder && 'border-b',
          !hasBorder && 'has-[.header-popover-full-panel]:border-b'
        )}
      >
        <div className="container flex h-20 justify-between">
          <div className="flex flex-1 items-center lg:hidden">
            <HamburgerBtnMenu />
          </div>

          <div className="flex items-center lg:flex-1">
            <Logo />
          </div>

          <div className="mx-4 flex flex-2 justify-center">
            <Navigation menu={navigationMenu} featuredCategory={featuredCategory} />
          </div>

          <div className="flex flex-1 items-center justify-end gap-x-2.5 sm:gap-x-6">
            <CurrLangDropdown currencies={currencies} languages={languages} className="hidden md:block" />
            <NotifyDropdown />
            <AvatarDropdown />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header2
