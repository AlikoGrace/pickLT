import clsx from 'clsx'

type HeadingProps = { level?: 1 | 2 | 3 | 4 | 5 | 6 } & React.ComponentPropsWithoutRef<
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
>

export function Heading({ className, level = 1, ...props }: HeadingProps) {
  let Element: `h${typeof level}` = `h${level}`

  return (
    <Element
      {...props}
      className={clsx(className, 'text-3xl font-semibold text-neutral-950 sm:text-4xl/10 dark:text-white')}
    />
  )
}

export function Subheading({ className, level = 2, ...props }: HeadingProps) {
  let Element: `h${typeof level}` = `h${level}`

  return (
    <Element {...props} className={clsx(className, 'text-lg font-normal text-neutral-500 dark:text-neutral-400')} />
  )
}

export default function HeadingWithSub({
  className,
  level = 1,
  subheading,
  children,
  isCenter,
  ...props
}: HeadingProps & { subheading?: string; children: React.ReactNode; isCenter?: boolean }) {
  return (
    <div className={clsx(className, 'relative mb-12 max-w-2xl', isCenter && 'mx-auto w-full text-center text-pretty')}>
      <Heading level={level} {...props}>
        {children}
      </Heading>
      {subheading && <Subheading className="mt-3.5">{subheading}</Subheading>}
    </div>
  )
}
