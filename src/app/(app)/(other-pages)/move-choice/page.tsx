'use client'

import { useMoveSearch } from '@/context/moveSearch'
import { AuthGate } from '@/components/AuthGate'
import Logo from '@/shared/Logo'
import ButtonSecondary from '@/shared/ButtonSecondary'
import {
  Calendar03Icon,
  Clock01Icon,
  DeliveryTruck01Icon,
  FlashIcon,
  Location01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// The persisted value is the slug; the label is looked up during render.
const MOVE_TYPE_SLUGS = ['light', 'regular', 'premium'] as const

const MoveChoiceContent = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    pickupLocation,
    dropoffLocation,
    moveType,
    setPickupLocation,
    setDropoffLocation,
    setMoveType,
    setIsInstantMove,
  } = useMoveSearch()

  // Read query params and update context
  useEffect(() => {
    const pickup = searchParams.get('pickup')
    const dropoff = searchParams.get('dropoff')
    const mt = searchParams.get('moveType')
    if (pickup) setPickupLocation(pickup)
    if (dropoff) setDropoffLocation(dropoff)
    if (mt) setMoveType(mt as any)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    router.prefetch('/add-listing/1')
    router.prefetch('/instant-move/inventory')
  }, [router])

  const handleInstantMove = () => {
    setIsInstantMove(true)
    router.push('/instant-move/inventory')
  }

  const handleBookLater = () => {
    setIsInstantMove(false)
    router.push('/add-listing/1')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24 sm:pt-12">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Logo className="w-28 sm:w-32" />
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white sm:text-3xl">
            {t('web:moveChoice.title')}
          </h1>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {t('web:moveChoice.subtitle')}
          </p>
        </div>

        {/* Move Summary Card */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
            {t('web:moveChoice.summary.title')}
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <HugeiconsIcon
                icon={Location01Icon}
                size={20}
                strokeWidth={1.5}
                className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:pickup.short.label')}</p>
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                  {pickupLocation || t('common:value.notSpecified.empty')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HugeiconsIcon
                icon={Location01Icon}
                size={20}
                strokeWidth={1.5}
                className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:dropoff.short.label')}</p>
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                  {dropoffLocation || t('common:value.notSpecified.empty')}
                </p>
              </div>
            </div>
            {moveType && (
              <div className="flex items-start gap-3">
                <HugeiconsIcon
                  icon={DeliveryTruck01Icon}
                  size={20}
                  strokeWidth={1.5}
                  className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:moveType.label')}</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {/* i18n-keys: booking.moveType.light.label, booking.moveType.regular.label, booking.moveType.premium.label */}
                    {(MOVE_TYPE_SLUGS as readonly string[]).includes(moveType)
                      ? t(`booking:moveType.${moveType}.label`)
                      : moveType}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Choice Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Instant Move Card */}
          <button
            onClick={handleInstantMove}
            className="group relative rounded-2xl border border-neutral-200 bg-white p-6 text-left transition-all hover:border-neutral-300 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
          >
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-700">
              <HugeiconsIcon
                icon={FlashIcon}
                size={24}
                strokeWidth={1.5}
                className="text-neutral-700 dark:text-neutral-200"
              />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              {t('booking:category.instant.label')}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              {t('web:moveChoice.instant.subtitle')}
            </p>
            <ul className="space-y-2 mb-5">
              <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <HugeiconsIcon
                  icon={Clock01Icon}
                  size={16}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
                {t('web:moveChoice.instant.eta')}
              </li>
              <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <HugeiconsIcon
                  icon={Location01Icon}
                  size={16}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
                {t('web:moveChoice.instant.tracking')}
              </li>
            </ul>
            <div className="flex items-center text-sm font-medium text-neutral-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400 transition-colors">
              {t('web:moveChoice.instant.cta')}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={1.5}
                className="ml-1 transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </button>

          {/* Book for Later Card */}
          <button
            onClick={handleBookLater}
            className="group relative rounded-2xl border border-neutral-200 bg-white p-6 text-left transition-all hover:border-neutral-300 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
          >
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-700">
              <HugeiconsIcon
                icon={Calendar03Icon}
                size={24}
                strokeWidth={1.5}
                className="text-neutral-700 dark:text-neutral-200"
              />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              {t('web:moveChoice.scheduled.title')}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              {t('web:moveChoice.scheduled.subtitle')}
            </p>
            <ul className="space-y-2 mb-5">
              <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <HugeiconsIcon
                  icon={Calendar03Icon}
                  size={16}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
                {t('web:moveChoice.scheduled.date')}
              </li>
              <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <HugeiconsIcon
                  icon={Clock01Icon}
                  size={16}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
                {t('web:moveChoice.scheduled.window')}
              </li>
            </ul>
            <div className="flex items-center text-sm font-medium text-neutral-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400 transition-colors">
              {t('web:moveChoice.scheduled.cta')}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={1.5}
                className="ml-1 transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </button>
        </div>

        {/* Back Button */}
        <div className="mt-10 text-center">
          <ButtonSecondary href="/" className="px-8">
            {t('common:action.backToHome.cta')}
          </ButtonSecondary>
        </div>
      </div>
    </div>
  )
}

const MoveChoiceFallback = () => {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center">
      {t('common:state.loading.label')}
    </div>
  )
}

const MoveChoicePage = () => {
  return (
    <AuthGate redirectBack="/move-choice">
      <Suspense fallback={<MoveChoiceFallback />}>
        <MoveChoiceContent />
      </Suspense>
    </AuthGate>
  )
}

export default MoveChoicePage
