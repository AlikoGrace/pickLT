import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

const HeroSectionWithSearchForm1 = ({
  className,
  searchForm,
  description,
  heading,
  imageAlt,
  image,
}: {
  className?: string
  heading: string | React.ReactNode
  description: string | React.ReactNode
  image: {
    src: string
    width: number
    height: number
  }
  imageAlt: string
  searchForm: React.ReactNode
}) => {
  return (
    <div className={clsx('relative flex flex-col-reverse pt-10 lg:flex-col lg:pt-12', className)}>
      {/* Mobile mover sign-in banner — visible only on small screens */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-orange-50 px-4 py-3 dark:bg-orange-900/20 lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Are you a mover?
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Sign in to start accepting moves
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login?type=mover"
            className="rounded-full bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700"
          >
            Sign in
          </Link>
          <Link
            href="/signup?type=mover"
            className="rounded-full border border-orange-300 px-4 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
          >
            Sign up
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="relative flex w-full flex-col items-start gap-y-8 pb-16 lg:pe-10 lg:pt-12 lg:pb-60 xl:gap-y-10 xl:pe-14">
          <h2
            className="text-5xl/[1.15] font-medium tracking-tight text-pretty xl:text-7xl/[1.1]"
            dangerouslySetInnerHTML={{ __html: heading || '' }}
          />
          {description}
          <div className="absolute start-0 bottom-4 hidden w-screen max-w-4xl lg:block xl:max-w-6xl">{searchForm}</div>
        </div>

        <div className="w-full">
          <Image className="w-full" src={image} alt={imageAlt} priority />
        </div>
      </div>
    </div>
  )
}

export default HeroSectionWithSearchForm1
