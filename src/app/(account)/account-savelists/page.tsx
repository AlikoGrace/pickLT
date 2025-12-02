import StayCard2 from '@/components/StayCard2'
import { getStayListings } from '@/data/listings'
import { Button } from '@/shared/Button'
import { Divider } from '@/shared/divider'
import T from '@/utils/getT'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account - Saved listings',
  description: 'Manage your saved listings',
}

const Page = async () => {
  const stayListings = await getStayListings()

  const renderSection1 = () => {
    return (
      <div>
        <h1 className="text-3xl font-semibold">{T['accountPage']['Saved listings']}</h1>

        <Divider className="my-8 w-14!" />

        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
          {stayListings.slice(0, 8).map((stay) => (
            <StayCard2 key={stay.id} data={stay} />
          ))}
        </div>
        <div className="mt-16 flex items-center justify-center">
          <Button>{T['common']['Show me more']}</Button>
        </div>
      </div>
    )
  }

  return renderSection1()
}

export default Page
