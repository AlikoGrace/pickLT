'use client'

import { useAuth } from '@/context/auth'
import { Trans, useTranslation } from 'react-i18next'
import Logo from '@/shared/Logo'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import {
  GoogleIcon,
  Mail01Icon,
  SmartPhone01Icon,
  ViewIcon,
  ViewOffIcon,
  ArrowRight01Icon,
  ArrowLeft02Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

/**
 * Login flow:
 * 1. Choose Google OAuth or Email/Password
 * 2. After auth, if phone not verified → mandatory phone OTP step
 * 3. Once phone verified → redirect to destination
 */
type Step = 'choice' | 'email' | 'phone-enter' | 'phone-verify'

function LoginContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const userType = searchParams.get('type') || 'client'
  const isMover = userType === 'mover'
  const redirectPath = searchParams.get('redirect')

  const {
    loginWithGoogle,
    loginWithEmail,
    setPhoneForVerification,
    sendPhoneVerification,
    confirmPhoneVerification,
    isAuthenticated,
    user,
    isLoading,
    logout,
  } = useAuth()

  const [step, setStep] = useState<Step>('choice')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getRedirectUrl = () => {
    if (redirectPath) return redirectPath
    return isMover ? '/dashboard' : '/'
  }

  // Redirect if authenticated AND phone is verified (useEffect avoids render-time setState)
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.phoneVerified) {
      // Block client accounts from accessing the mover portal
      if (isMover && user.userType === 'client') {
        setError(t('auth:login.clientInMoverPortal.error'))
        logout()
        return
      }
      router.replace(getRedirectUrl())
    }
  }, [isLoading, isAuthenticated, user?.phoneVerified]) // eslint-disable-line react-hooks/exhaustive-deps

  // If user is authenticated but phone not verified, jump to the phone step
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !user.phoneVerified && step === 'choice') {
      setStep('phone-enter')
    }
  }, [isLoading, isAuthenticated, user, step])

  // Show redirecting state (only if the user type matches the page type)
  if (!isLoading && isAuthenticated && user?.phoneVerified && !(isMover && user.userType === 'client')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={40} className="mx-auto text-green-500" />
          <p className="text-sm text-neutral-500">{t('common:state.redirecting.label')}</p>
        </div>
      </div>
    )
  }

  const handleGoogleLogin = () => {
    loginWithGoogle(getRedirectUrl(), isMover ? 'mover' : 'client')
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await loginWithEmail(email, password)
      // After login, auth context reloads. If phone not verified,
      // the useEffect above will push to phone-enter step.
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth:login.failed.error')
      if (message.includes('Invalid credentials')) {
        setError(t('auth:login.invalidCredentials.error'))
      } else if (message.includes('Rate limit')) {
        setError(t('auth:login.rateLimited.error'))
      } else {
        setError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSetPhoneAndSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`
      // Step 1: Set phone on Appwrite auth account via admin API
      await setPhoneForVerification(formattedPhone)
      // Step 2: Trigger SMS OTP via Appwrite's phone verification (Twilio)
      await sendPhoneVerification()
      setStep('phone-verify')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth:otp.sendFailed.error')
      if (message.includes('Invalid phone')) {
        setError(t('auth:phone.invalid.error'))
      } else {
        setError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await confirmPhoneVerification(user!.authId, otp)
      // After verification, auth context reloads with phoneVerified = true
      // The useEffect will handle the redirect
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth:otp.invalid.error')
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendOTP = async () => {
    setError('')
    setIsSubmitting(true)
    try {
      await sendPhoneVerification()
      setOtp('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth:otp.resendFailed.error')
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-neutral-500">{t('common:state.loading.label')}</p>
      </div>
    )
  }

  return (
    <div className="container pb-16">
      <div className="my-16 flex justify-center">
        <Logo className="w-36" />
      </div>

      <div className="mx-auto max-w-md space-y-6">
        {/* Redirect notice */}
        {redirectPath && step === 'choice' && (
          <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 p-4 text-center">
            <p className="text-sm text-primary-700 dark:text-primary-300">
              {t('web:login.resumeMove.helper')}
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
            {isMover ? t('web:login.moverBadge.label') : t('web:login.clientBadge.label')}
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* ─── Step 1a: Method choice ─── */}
        {step === 'choice' && (
          <div className="space-y-3">
            <h2 className="text-center text-xl font-semibold text-neutral-900 dark:text-white">
              {t('auth:login.title')}
            </h2>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
            >
              <HugeiconsIcon icon={GoogleIcon} size={20} strokeWidth={1.5} />
              {t('auth:login.google.cta')}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                  {t('common:separator.or.label')}
                </span>
              </div>
            </div>

            {/* Email */}
            <button
              onClick={() => { setStep('email'); setError('') }}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
            >
              <HugeiconsIcon icon={Mail01Icon} size={20} strokeWidth={1.5} />
              {t('auth:login.email.cta')}
            </button>

            <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
              {t('web:login.phoneRequired.helper')}
            </p>
          </div>
        )}

        {/* ─── Step 1b: Email login form ─── */}
        {step === 'email' && (
          <div className="space-y-4">
            <button
              onClick={() => { setStep('choice'); setError('') }}
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={16} strokeWidth={1.5} />
              {t('common:action.back.cta')}
            </button>

            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {t('auth:login.emailStep.title')}
            </h2>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('auth:field.email.label')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
                  placeholder={t('auth:field.email.placeholder')}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('auth:field.password.label')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 pr-12 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting ? t('auth:login.submitting.cta') : t('auth:login.submit.cta')}
                {!isSubmitting && <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} />}
              </button>
            </form>
          </div>
        )}

        {/* ─── Step 2a: Phone number entry (mandatory verification) ─── */}
        {step === 'phone-enter' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-center">
              <HugeiconsIcon icon={SmartPhone01Icon} size={24} className="mx-auto mb-2 text-amber-600" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {t('auth:phone.required.title')}
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {t('web:login.phoneVerify.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSetPhoneAndSendOTP} className="space-y-4">
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('auth:field.phone.label')}
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
                  placeholder={t('auth:field.phone.placeholder')}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting ? t('auth:otp.sending.cta') : t('auth:otp.send.cta')}
                {!isSubmitting && <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} />}
              </button>
            </form>
          </div>
        )}

        {/* ─── Step 2b: OTP verification ─── */}
        {step === 'phone-verify' && (
          <div className="space-y-4">
            <button
              onClick={() => { setStep('phone-enter'); setError(''); setOtp('') }}
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={16} strokeWidth={1.5} />
              {t('auth:otp.changeNumber.cta')}
            </button>

            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {t('auth:otp.title')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              <Trans
                i18nKey="auth:otp.sentTo.subtitle"
                values={{ phone }}
                components={[
                  <span key="phone" className="font-medium text-neutral-700 dark:text-neutral-200" />,
                ]}
              />
            </p>

            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-4 text-center text-2xl font-semibold tracking-[0.5em] text-neutral-900 placeholder-neutral-300 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-600"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting ? t('auth:otp.verifying.cta') : t('web:login.verifyAndSignIn.cta')}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isSubmitting}
                className="w-full text-center text-sm text-primary-600 hover:underline disabled:opacity-50 dark:text-primary-400"
              >
                {t('auth:otp.resend.cta')}
              </button>
            </form>
          </div>
        )}

        {/* Switch account type & signup link — only show during initial steps */}
        {(step === 'choice' || step === 'email') && (
          <>
            <div className="block text-center text-sm text-neutral-500 dark:text-neutral-400">
              {isMover ? t('web:login.switchToClient.label') : t('web:login.switchToMover.label')}{' '}
              <Link
                href={
                  isMover
                    ? `/login?type=client${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ''}`
                    : `/login?type=mover${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ''}`
                }
                className="font-medium text-primary-600 hover:underline"
              >
                {isMover ? t('web:login.asClient.cta') : t('web:login.asMover.cta')}
              </Link>
            </div>

            <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
              {t('auth:login.noAccount.label')}{' '}
              <Link
                href={`/signup?type=${userType}${redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                className="font-medium underline"
              >
                {t('auth:signup.cta')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LoginFallback() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      {t('common:state.loading.label')}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  )
}
