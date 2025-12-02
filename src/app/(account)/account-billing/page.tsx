import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import T from '@/utils/getT'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account - Payments & Payouts',
  description: 'Manage your payments and payouts ',
}

const AccountBilling = () => {
  return (
    <div>
      {/* HEADING */}
      <h1 className="text-3xl font-semibold">{T['accountPage']['Payments & payouts']}</h1>

      <Divider className="my-8 w-14!" />

      <div className="max-w-2xl">
        <span className="block text-xl font-semibold">{T['accountPage']['Payout methods']}</span>
        <br />
        <span className="block text-neutral-700 dark:text-neutral-300">
          {` When you receive a payment for a reservation, we call that payment
              to you a "payout." Our secure payment system supports several
              payout methods, which can be set up below. Go to FAQ.`}
          <br />
          <br />
          To get paid, you need to set up a payout method Airbnb releases payouts about 24 hours after a guest’s
          scheduled check-in time. The time it takes for the funds to appear in your account depends on your payout
          method. Learn more
        </span>
        <div className="pt-10">
          <ButtonPrimary>{T['accountPage']['Add payout method']}</ButtonPrimary>
        </div>
      </div>
    </div>
  )
}

export default AccountBilling
