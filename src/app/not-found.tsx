import I404Png from '@/images/404.png'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Image from 'next/image'

const NotFound = () => (
  <div className="nc-Page404">
    <div className="relative container pt-5 pb-16 lg:pt-5 lg:pb-20">
      {/* HEADER */}
      <header className="mx-auto max-w-2xl space-y-2 text-center">
        <Image src={I404Png} alt="not-found" />
        <span className="block text-sm font-medium tracking-wider text-neutral-800 sm:text-base dark:text-neutral-200">
          {`THE PAGE YOU WERE LOOKING FOR DOESN'T EXIST.`}{' '}
        </span>
        <div className="pt-8">
          <ButtonPrimary href="/">Return Home Page</ButtonPrimary>
        </div>
      </header>
    </div>
  </div>
)

export default NotFound
