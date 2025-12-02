import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC } from 'react'

const styles = {
  base: 'absolute z-10 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-primary-600 text-neutral-50 hover:bg-primary-700 focus:outline-hidden cursor-pointer',
  default: 'size-16 end-2 xl:end-4',
  small: 'size-14 end-2',
}

interface Props {
  className?: string
  fieldStyle: 'default' | 'small'
}

export const ButtonSubmit: FC<Props> = ({ className, fieldStyle = 'default' }) => {
  return (
    <button type="submit" className={clsx(styles.base, styles[fieldStyle], className)}>
      <HugeiconsIcon icon={Search01Icon} size={24} />
    </button>
  )
}
