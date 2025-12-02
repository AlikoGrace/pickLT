import clsx from 'clsx'

interface Props extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export const SectionHeading = ({ className, children, level: Lv = 'h2', ...props }: Props) => {
  return (
    <Lv className={clsx('text-xl font-semibold', className)} {...props}>
      {children}
    </Lv>
  )
}

export const SectionSubheading = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h3 className={clsx('mt-2.5 block text-base/6 text-neutral-700 dark:text-neutral-300', className)} {...props}>
      {children}
    </h3>
  )
}
