'use client'

import { AuthGate } from '@/components/AuthGate'
import { useMoveSearch, StoredMove } from '@/context/moveSearch'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import {
  Calendar03Icon,
  Coins01Icon,
  CreditCardIcon,
  CubeIcon,
  DeliveryTruck01Icon,
  FlashIcon,
  Home01Icon,
  Location01Icon,
  PaypalIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'
import { formatDateWith, formatMoney } from '@/lib/format'
import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

// Helper to format labels
const formatLabel = (value: string | null | undefined, t: TFunction): string => {
  if (!value) return t('common:value.notSpecified.empty')
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const formatDate = (dateStr: string | null, t: TFunction) => {
  if (!dateStr) return t('common:value.notSelected.empty')
  try {
    const date = new Date(dateStr)
    return formatDateWith(date, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

type PaymentMethod = 'cash' | 'card' | 'paypal'

const PayDoneContent = () => {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const handle = searchParams.get('handle')
  const paymentMethodParam = searchParams.get('paymentMethod') as PaymentMethod | null
  const paymentMethod = paymentMethodParam || 'card'
  
  const { getMoveByHandle } = useMoveSearch()
  const [move, setMove] = useState<StoredMove | undefined>(undefined)

  useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [])

  useEffect(() => {
    if (handle) {
      const foundMove = getMoveByHandle(handle)
      setMove(foundMove)
    }
  }, [handle, getMoveByHandle])

  const pickupDisplay = move?.pickupStreetAddress || move?.pickupLocation || t('booking:pickup.fallback.label')
  const dropoffDisplay = move?.dropoffStreetAddress || t('booking:dropoff.fallback.label')
  const isInstantMove = move?.status === 'in_progress' || move?.arrivalWindow === 'now'

  const getPaymentMethodDisplay = () => {
    switch (paymentMethod) {
      case 'cash':
        return t('booking:payment.cashLong.label')
      case 'paypal':
        return t('common:payment.method.payPal.label')
      default:
        return t('booking:payment.creditCard.label')
    }
  }

  const getPaymentIcon = () => {
    switch (paymentMethod) {
      case 'cash':
        return Coins01Icon
      case 'paypal':
        return PaypalIcon
      default:
        return CreditCardIcon
    }
  }

  const getStatusBadge = () => {
    if (isInstantMove) {
      return <Badge className="w-fit" color="lime">{t('moves:status.inProgress.label')}</Badge>
    }
    if (paymentMethod === 'cash') {
      return <Badge className="w-fit" color="amber">{t('moves:status.confirmedPayLater.label')}</Badge>
    }
    return <Badge className="w-fit" color="yellow">{t('moves:status.pending.label')}</Badge>
  }

  const getHeading = () => {
    if (isInstantMove) {
      return paymentMethod === 'cash'
        ? t('web:payDone.confirmed.title')
        : t('web:payDone.confirmedPaid.title')
    }
    return paymentMethod === 'cash'
      ? t('web:payDone.booked.title')
      : t('web:payDone.congrats.title')
  }

  return (
    <main className="container mt-10 mb-24 sm:mt-16 lg:mb-32">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-y-12 px-0 sm:rounded-2xl sm:p-6 xl:p-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">{getHeading()}</h1>
        <Divider />

        {/* Cash payment reminder */}
        {paymentMethod === 'cash' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start gap-4">
              <HugeiconsIcon
                icon={Coins01Icon}
                size={24}
                strokeWidth={1.5}
                className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              />
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                  {t('booking:payment.reminder.title')}
                </h4>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  <Trans
                    i18nKey="booking:payment.reminder.body"
                    values={{
                      amount: formatMoney(move?.totalPrice ?? 0),
                      when: isInstantMove
                        ? t('booking:payment.reminder.whenInstant.label')
                        : t('booking:payment.reminder.whenScheduled.label'),
                    }}
                    components={[<strong key="amount" />]}
                  />
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-2xl font-semibold">
            {isInstantMove ? t('web:payDone.instant.subtitle') : t('web:payDone.scheduled.subtitle')}
          </h3>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center">
            <div className="w-full shrink-0 sm:w-40">
              <div className="aspect-w-4 overflow-hidden rounded-2xl aspect-h-3 sm:aspect-h-4 bg-neutral-100 dark:bg-neutral-800">
                {move?.coverPhotoId ? (
                  <Image
                    fill
                    alt={t('booking:photos.preview.a11y')}
                    className="object-cover"
                    src={move.coverPhotoId}
                    sizes="200px"
                    priority
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <HugeiconsIcon
                      icon={isInstantMove ? FlashIcon : DeliveryTruck01Icon}
                      size={48}
                      strokeWidth={1}
                      className="text-neutral-400"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-y-3 pt-5 sm:px-5 sm:pb-5">
              <div>
                <span className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {isInstantMove
                    ? t('booking:category.instant.label')
                    : t('booking:moveType.suffixed.label', { type: formatLabel(move?.moveType, t) })}
                  {!isInstantMove && ` · ${formatDate(move?.moveDate || null, t)}`}
                </span>
                <span className="mt-1 block text-base font-medium sm:text-lg">
                  {pickupDisplay.split(',')[0]} → {dropoffDisplay.split(',')[0]}
                </span>
              </div>
              <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                {t('moves:itemCount', { count: move?.inventoryCount || 0 })}
                {!isInstantMove && move?.crewSize && ` · ${t('moves:moverCount', { count: Number(move.crewSize) })}`}
                {!isInstantMove && move?.vehicleType && ` · ${formatLabel(move.vehicleType, t)}`}
              </span>
              <Divider className="w-10!" />
              {getStatusBadge()}
            </div>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-neutral-200 rounded-3xl border border-neutral-200 text-neutral-500 sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-neutral-700 dark:border-neutral-700 dark:text-neutral-400">
          <div className="flex flex-1 gap-x-4 p-5">
            <HugeiconsIcon 
              icon={isInstantMove ? FlashIcon : Calendar03Icon} 
              size={32} 
              strokeWidth={1.5} 
            />
            <div className="flex flex-col">
              <span className="text-sm text-neutral-400">
                {isInstantMove ? t('moves:detail.moveStatus.label') : t('booking:field.moveDate.label')}
              </span>
              <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {isInstantMove ? t('moves:status.inProgress.label') : formatDate(move?.moveDate || null, t)}
              </span>
            </div>
          </div>
          <div className="flex flex-1 gap-x-4 p-5">
            <HugeiconsIcon icon={CubeIcon} size={32} strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="text-sm text-neutral-400">{t('moves:detail.items.label')}</span>
              <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {t('moves:itemCount', { count: move?.inventoryCount || 0 })}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-semibold">{t('moves:booking.title')}</h3>
          <DescriptionList className="mt-5">
            <DescriptionTerm>{t('moves:booking.code.label')}</DescriptionTerm>
            <DescriptionDetails className="font-mono">
              {move?.bookingCode || t('common:value.notAvailable.label')}
            </DescriptionDetails>

            {paymentMethod !== 'cash' && (
              <>
                <DescriptionTerm>{t('booking:payment.paidOn.label')}</DescriptionTerm>
                <DescriptionDetails>
                  {move?.paidAt
                    ? formatDate(move.paidAt, t)
                    : t('common:value.notAvailable.label')}
                </DescriptionDetails>
              </>
            )}

            <DescriptionTerm>{t('booking:pricing.total.label')}</DescriptionTerm>
            <DescriptionDetails className="text-primary-600 font-semibold">
              {formatMoney(move?.totalPrice ?? 0)}
            </DescriptionDetails>
            
            <DescriptionTerm>{t('moves:payment.method.label')}</DescriptionTerm>
            <DescriptionDetails className="flex items-center gap-2">
              <HugeiconsIcon icon={getPaymentIcon()} size={18} strokeWidth={1.5} />
              {getPaymentMethodDisplay()}
            </DescriptionDetails>
          </DescriptionList>
        </div>

        <div className="flex flex-wrap gap-4">
          <ButtonPrimary href="/">
            <HugeiconsIcon icon={Home01Icon} size={20} strokeWidth={1.5} />
            {t('common:action.backToHome.cta')}
          </ButtonPrimary>
          {move && (
            <ButtonPrimary href={`/stay-listings/${move.handle}`} className="bg-neutral-800 hover:bg-neutral-700">
              <HugeiconsIcon icon={Location01Icon} size={20} strokeWidth={1.5} />
              {t('web:payDone.viewDetails.cta')}
            </ButtonPrimary>
          )}
        </div>
      </div>
    </main>
  )
}

const Page = () => {
  const { t } = useTranslation()
  return (
    <AuthGate redirectBack="/pay-done">
      <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">{t('common:state.loading.label')}</div>}>
        <PayDoneContent />
      </Suspense>
    </AuthGate>
  )
}

export default Page
