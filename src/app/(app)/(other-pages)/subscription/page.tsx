import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import T from '@/utils/getT'
import { CheckIcon } from '@heroicons/react/24/solid'
import { Metadata } from 'next'

const pricings = [
  {
    isPopular: false,
    name: 'Starter',
    pricing: '$5',
    per: '/mo',
    features: ['Automated Reporting', 'Faster Processing', 'Customizations'],
    description: `Literally you probably haven't heard of them jean shorts.`,
  },
  {
    isPopular: true,
    name: 'Basic',
    pricing: '$15',
    per: '/mo',
    features: ['Everything in Starter', '100 Builds', 'Progress Reports', 'Premium Support'],
    description: `Literally you probably haven't heard of them jean shorts.`,
  },
  {
    isPopular: false,
    name: 'Plus',
    pricing: '$25',
    per: '/mo',
    features: ['Everything in Basic', 'Unlimited Builds', 'Advanced Analytics', 'Company Evaluations'],
    description: `Literally you probably haven't heard of them jean shorts.`,
  },
]

export const metadata: Metadata = {
  title: 'Subscription',
  description: 'Subscription page for our service, offering various pricing plans to fit your needs.',
}

const Page = () => {
  const renderPricingItem = (pricing: (typeof pricings)[number], index: number) => {
    return (
      <div
        key={index}
        className={`relative flex h-full flex-col overflow-hidden rounded-3xl border-2 px-6 py-8 ${
          pricing.isPopular ? 'border-primary-500' : 'border-neutral-100 dark:border-neutral-700'
        }`}
      >
        {pricing.isPopular && (
          <span className="absolute end-3 top-3 z-10 rounded-full bg-primary-500 px-3 py-1 text-xs tracking-widest text-white">
            {T['subscriptionPage']['popular']}
          </span>
        )}
        <div className="mb-8">
          <h3 className="mb-2 block text-sm font-medium tracking-widest text-neutral-600 uppercase dark:text-neutral-300">
            {pricing.name}
          </h3>
          <h2 className="flex items-center text-5xl leading-none text-neutral-900 dark:text-neutral-300">
            <span>{pricing.pricing}</span>
            <span className="ms-1 text-lg font-normal text-neutral-500">{pricing.per}</span>
          </h2>
        </div>
        <nav className="mb-8 space-y-4">
          {pricing.features.map((item, index) => (
            <li className="flex items-center" key={index}>
              <span className="me-4 inline-flex shrink-0 text-primary-600">
                <CheckIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-neutral-700 dark:text-neutral-300">{item}</span>
            </li>
          ))}
        </nav>
        <div className="mt-auto flex flex-col">
          {pricing.isPopular ? (
            <ButtonPrimary>{T['common']['submit']}</ButtonPrimary>
          ) : (
            <ButtonSecondary>
              <span className="font-medium">{T['common']['submit']}</span>
            </ButtonSecondary>
          )}
          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{pricing.description}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`container pb-24 lg:pb-32`}>
      <header className="mx-auto my-20 max-w-2xl text-center">
        <h1 className="flex items-center justify-center text-4xl/[1.15] font-semibold sm:text-5xl/[1.15]">
          <span className="me-4 text-3xl leading-none md:text-4xl">💎</span>
          {T['subscriptionPage']['Subscription']}
        </h1>
        <span className="mt-2 block text-sm text-neutral-700 sm:text-base dark:text-neutral-200">
          Pricing to fit the needs of any companie size.
        </span>
      </header>
      <section className="overflow-hidden text-sm text-neutral-600 md:text-base">
        <div className="grid gap-5 lg:grid-cols-3 xl:gap-8">{pricings.map(renderPricingItem)}</div>
      </section>
    </div>
  )
}

export default Page
