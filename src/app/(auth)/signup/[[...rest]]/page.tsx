'use client'

import Logo from '@/shared/Logo'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { SignUp } from '@clerk/nextjs'

function SignupContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'client'
  const isMover = type === 'mover'
  const redirectPath = searchParams.get('redirect')

  const getRedirectUrl = () => {
    if (redirectPath) return redirectPath
    return isMover ? '/dashboard' : '/'
  }

  return (
    <div className="container pb-16">
      <div className="my-16 flex justify-center">
        <Logo className="w-32" />
      </div>

      <div className="mx-auto max-w-md space-y-6">
        {/* Redirect notice */}
        {redirectPath && (
          <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 p-4 text-center">
            <p className="text-sm text-primary-700 dark:text-primary-300">
              Create an account to continue with your move. Your progress has been saved.
            </p>
          </div>
        )}

        <div className="text-center">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {isMover ? 'Mover Sign Up' : 'Client Sign Up'}
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {isMover
              ? 'Join our network of professional movers'
              : 'Create an account to book your moves'}
          </p>
        </div>

        {/* Clerk SignUp Component */}
        <div className="flex justify-center">
          <SignUp
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
            signInUrl={isMover ? '/login?type=mover' : `/login?type=client${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ''}`}
          />
        </div>

        {/* Already have an account */}
        <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
          Already have an account?{' '}
          <Link href={`/login?type=${type}${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ''}`} className="font-medium underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="container py-16 text-center">Loading...</div>}>
      <SignupContent />
    </Suspense>
  )
}
