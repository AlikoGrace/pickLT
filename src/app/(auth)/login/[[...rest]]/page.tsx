'use client'

import Logo from '@/shared/Logo'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { SignIn } from '@clerk/nextjs'

const LoginContent = () => {
  const searchParams = useSearchParams()
  const userType = searchParams.get('type') || 'client'
  const isMover = userType === 'mover'
  const redirectPath = searchParams.get('redirect')

  // Determine where to go after successful login
  const getRedirectUrl = () => {
    if (redirectPath) return redirectPath
    return isMover ? '/dashboard' : '/'
  }

  return (
    <div className="container">
      <div className="my-16 flex justify-center">
        <Logo className="w-36" />
      </div>

      <div className="mx-auto max-w-md space-y-6">
        {/* Redirect notice */}
        {redirectPath && (
          <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 p-4 text-center">
            <p className="text-sm text-primary-700 dark:text-primary-300">
              Sign in to continue with your move. Your progress has been saved.
            </p>
          </div>
        )}

        {/* User type badge */}
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium ${
              isMover
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
            }`}
          >
            {isMover ? '🚚 Mover Account' : '👤 Client Account'}
          </span>
        </div>

        {/* Clerk SignIn Component */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                cardBox: 'w-full shadow-none',
                card: 'w-full shadow-none p-0',
              },
            }}
            {...(redirectPath
              ? { forceRedirectUrl: redirectPath }
              : { fallbackRedirectUrl: getRedirectUrl() }
            )}
            signUpUrl={isMover ? '/signup?type=mover' : `/signup?type=client${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ''}`}
          />
        </div>

        {/* Switch account type */}
        <div className="block text-center text-sm text-neutral-500 dark:text-neutral-400">
          {isMover ? 'Are you a client?' : 'Are you a mover?'}{' '}
          <Link
            href={isMover ? `/login?type=client${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ''}` : `/login?type=mover${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ''}`}
            className="font-medium text-primary-600 hover:underline"
          >
            {isMover ? 'Login as Client' : 'Login as Mover'}
          </Link>
        </div>
      </div>
    </div>
  )
}

const Page = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">Loading...</div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

export default Page
