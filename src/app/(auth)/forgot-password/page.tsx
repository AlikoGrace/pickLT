import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import T from '@/utils/getT'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your password',
}

const Page = () => {
  return (
    <div className="container">
      <div className="my-16 flex justify-center">
        <Logo className="w-32" />
      </div>

      <div className="mx-auto max-w-md space-y-6">
        {/* FORM */}
        <form className="grid grid-cols-1 gap-6" action="#" method="post">
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{T['login']['Email address']}</Label>
            <Input type="email" placeholder="example@example.com" className="mt-1" />
          </Field>

          <ButtonPrimary type="submit">{T['common']['Continue']}</ButtonPrimary>
        </form>

        {/* ==== */}
        <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
          {T['login']['New user?']} {` `}
          <Link href="/signup" className="font-medium underline">
            {T['login']['Create an account']}
          </Link>
          {`  or  `}
          <Link href="/login" className="font-medium underline">
            {T['login']['Sign in']}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Page
