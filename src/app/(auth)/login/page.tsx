import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import T from '@/utils/getT'
import { Metadata } from 'next'
import Link from 'next/link'
import type { JSX } from 'react'

const socials: {
  name: string
  href: string
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element
}[] = [
  {
    name: 'Continue with Google',
    href: '#',
    icon: (props) => (
      <svg viewBox="0 0 48 48" {...props}>
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.01 1.53 7.39 2.81l5.45-5.45C33.64 3.88 29.24 2 24 2 14.73 2 6.91 7.62 3.98 15.44l6.71 5.21C12.27 14.53 17.68 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.1 24.5c0-1.64-.15-3.21-.43-4.73H24v9.01h12.44c-.54 2.91-2.18 5.38-4.63 7.03l7.16 5.57C43.91 37.65 46.1 31.62 46.1 24.5z"
        />
        <path
          fill="#FBBC05"
          d="M10.69 28.65c-.48-1.45-.76-2.98-.76-4.65s.27-3.2.76-4.65l-6.71-5.21C2.74 17.09 2 20.46 2 24s.74 6.91 1.98 9.86l6.71-5.21z"
        />
        <path
          fill="#34A853"
          d="M24 46c5.24 0 9.64-1.73 12.85-4.73l-7.16-5.57c-1.98 1.33-4.51 2.13-5.69 2.13-6.32 0-11.73-5.03-13.31-11.15l-6.71 5.21C6.91 40.38 14.73 46 24 46z"
        />
      </svg>
    ),
  },
]

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your account',
}

const Page = () => {
  return (
    <div className="container">
      <div className="my-16 flex justify-center">
        <Logo className="w-32" />
      </div>

      <div className="mx-auto max-w-md space-y-6">
        <div className="grid gap-3">
          {socials.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex w-full rounded-lg bg-primary-50 px-4 py-3 transition-transform hover:translate-y-0.5 dark:bg-neutral-800"
            >
              <item.icon className="size-5 shrink-0" />
              <p className="grow text-center text-sm font-medium text-neutral-700 dark:text-neutral-300">{item.name}</p>
            </Link>
          ))}
        </div>
        {/* OR */}
        <div className="relative text-center">
          <span className="relative z-10 inline-block bg-white px-4 text-sm font-medium dark:bg-neutral-900 dark:text-neutral-400">
            OR
          </span>
          <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 border border-neutral-100 dark:border-neutral-800"></div>
        </div>
        {/* FORM */}
        <form className="grid grid-cols-1 gap-6" action="#" method="post">
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{T['login']['Email address']}</Label>
            <Input type="email" placeholder="example@example.com" className="mt-1" />
          </Field>
          <Field className="block">
            <div className="flex items-center justify-between text-neutral-800 dark:text-neutral-200">
              <Label>{T['login']['Password']}</Label>
              <Link href="/forgot-password" className="text-sm font-medium underline">
                {T['login']['Forgot password?']}
              </Link>
            </div>
            <Input type="password" className="mt-1" />
          </Field>
          <ButtonPrimary type="submit">Login</ButtonPrimary>
        </form>

        {/* ==== */}
        <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
          {T['login']['New user?']} {` `}
          <Link href="/signup" className="font-medium underline">
            {T['login']['Create an account']}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Page
