import StayCard from '@/components/StayCard'
import { getStayListings } from '@/data/listings'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import T from '@/utils/getT'
import { EyeIcon, PencilSquareIcon } from '@heroicons/react/24/outline'

const Page = async () => {
  const listing = (await getStayListings())[0]

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">{T['addListings']['page10']['pageTitle']}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {T['addListings']['page10']['pageDescription']}
        </span>
      </div>

      <Divider className="w-14!" />

      <div>
        <h3 className="text-lg font-semibold">{T['addListings']['page10']['This is your listing']}</h3>
        <div className="mt-6 max-w-sm">
          <StayCard data={listing} />
        </div>
        <div className="mt-8 flex items-center gap-x-3">
          <ButtonSecondary href={'/add-listing/1'}>
            <PencilSquareIcon className="h-5 w-5" />
            <span>{T['addListings']['page10']['Edit']}</span>
          </ButtonSecondary>

          <ButtonPrimary href={'/stay-listings/preview-stay-84763232'}>
            <EyeIcon className="h-5 w-5" />
            <span>{T['addListings']['page10']['Preview']}</span>
          </ButtonPrimary>
        </div>
      </div>
      {/*  */}
    </>
  )
}

export default Page
