'use client'

import { useAuth } from '@/context/auth'
import { account } from '@/lib/appwrite'
import { compressImage } from '@/utils/compressImage'
import Avatar from '@/shared/Avatar'
import {
  UserCircleIcon,
  TruckIcon,
  BellIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  CameraIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'

type ModalType = 'editName' | 'changeEmail' | 'changePhone' | 'editVehicle' | null

/**
 * Stored slug -> catalog segment. The slug is what Appwrite persists; the label is
 * looked up. Never derive the slug back out of a label.
 */
const VEHICLE_TYPE_SLUGS = [
  { value: 'small_van', key: 'smallVan' },
  { value: 'medium_truck', key: 'mediumTruck' },
  { value: 'large_truck', key: 'largeTruck' },
] as const

const SettingsPage = () => {
  const { user, updateUser, logout, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Edit name state
  const [fullName, setFullName] = useState(user?.fullName || '')

  // Change email state
  const [newEmail, setNewEmail] = useState('')
  const [emailStep, setEmailStep] = useState<'input' | 'sent'>('input')

  // Change phone state
  const [newPhone, setNewPhone] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input')

  // Vehicle edit state
  const [vehicleForm, setVehicleForm] = useState({
    vehicleBrand: user?.moverDetails?.vehicleBrand || '',
    vehicleModel: user?.moverDetails?.vehicleModel || '',
    vehicleYear: user?.moverDetails?.vehicleYear || '',
    vehicleCapacity: user?.moverDetails?.vehicleCapacity || '',
    vehicleRegistration: user?.moverDetails?.vehicleRegistration || '',
    vehicleType: user?.moverDetails?.vehicleType || '',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError(t('errors:upload.notAnImage'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t('errors:upload.tooLarge', { limit: '5MB' }))
      return
    }

    setIsUploading(true)
    setError('')
    try {
      // Compress image before uploading
      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressed)

      const res = await fetch('/api/user/upload-photo', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errors:upload.failed'))
      }

      const { photoUrl } = await res.json()
      updateUser({ profilePhoto: photoUrl })
      setSuccess(t('profile:photo.updated.success'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:upload.photoFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveName = async () => {
    if (!fullName.trim()) return
    setIsSaving(true)
    setError('')
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errors:profile.nameUpdateFailed'))
      }
      updateUser({ fullName: fullName.trim() })
      await refreshProfile()
      setActiveModal(null)
      setSuccess(t('profile:name.updated.success'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:generic.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return
    setIsSaving(true)
    setError('')
    try {
      const res = await fetch('/api/user/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errors:profile.emailChangeFailed'))
      }

      // Send verification email to the new address
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        await account.createVerification(`${origin}/settings`)
      } catch {
        // Verification email is best-effort
      }

      setEmailStep('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:profile.emailChangeFailed'))
    } finally {
      setIsSaving(false)
    }
  }

    // Compute initials from user's full name
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'


  const handleChangePhone = async () => {
    if (!newPhone.trim()) return
    setIsSaving(true)
    setError('')
    try {
      const formatted = newPhone.startsWith('+') ? newPhone : `+${newPhone}`
      const res = await fetch('/api/user/change-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatted }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errors:profile.phoneChangeFailed'))
      }

      // Send OTP to the new phone number
      await account.createPhoneVerification()
      setPhoneStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:profile.phoneChangeFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp.trim() || !user) return
    setIsSaving(true)
    setError('')
    try {
      await account.updatePhoneVerification(user.authId, phoneOtp.trim())
      await refreshProfile()
      setActiveModal(null)
      setSuccess(t('profile:phone.updated.success'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:otp.invalid.error'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const closeModal = () => {
    setActiveModal(null)
    setError('')
    setEmailStep('input')
    setPhoneStep('input')
    setNewEmail('')
    setNewPhone('')
    setPhoneOtp('')
  }

  const handleSaveVehicle = async () => {
    if (!vehicleForm.vehicleBrand.trim() || !vehicleForm.vehicleModel.trim() || !vehicleForm.vehicleRegistration.trim() || !vehicleForm.vehicleType) {
      setError(t('errors:vehicle.fieldsRequired'))
      return
    }
    setIsSaving(true)
    setError('')
    try {
      const res = await fetch('/api/mover/submit-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: user?.fullName,
          phone: user?.phone,
          driversLicense: user?.moverDetails?.driversLicense || '',
          primaryCity: user?.moverDetails?.primaryCity || '',
          primaryCountry: user?.moverDetails?.primaryCountry || '',
          vehicleBrand: vehicleForm.vehicleBrand,
          vehicleModel: vehicleForm.vehicleModel,
          vehicleYear: vehicleForm.vehicleYear,
          vehicleCapacity: vehicleForm.vehicleCapacity,
          vehicleRegistration: vehicleForm.vehicleRegistration,
          vehicleType: vehicleForm.vehicleType,
          languages: user?.moverDetails?.languages || [],
          yearsExperience: user?.moverDetails?.yearsExperience || 0,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errors:vehicle.updateFailed'))
      }
      await refreshProfile()
      setActiveModal(null)
      setSuccess(t('booking:vehicle.updated.success'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:vehicle.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const settingsSections = [
    {
      id: 'account',
      title: t('profile:section.account.title'),
      items: [
        {
          id: 'editName',
          icon: PencilSquareIcon,
          label: t('profile:editName.label'),
          description: user?.fullName || t('profile:editName.helper'),
          action: () => {
            setFullName(user?.fullName || '')
            setError('')
            setActiveModal('editName')
          },
        },
        {
          id: 'changeEmail',
          icon: EnvelopeIcon,
          label: t('profile:changeEmail.label'),
          description: user?.email || t('profile:changeEmail.helper'),
          action: () => {
            setNewEmail('')
            setEmailStep('input')
            setError('')
            setActiveModal('changeEmail')
          },
        },
        {
          id: 'changePhone',
          icon: PhoneIcon,
          label: t('profile:changePhone.label'),
          description: user?.phone || t('profile:changePhone.helper'),
          action: () => {
            setNewPhone('')
            setPhoneOtp('')
            setPhoneStep('input')
            setError('')
            setActiveModal('changePhone')
          },
        },
        {
          id: 'vehicle',
          icon: TruckIcon,
          label: t('booking:vehicle.title'),
          description: user?.moverDetails?.vehicleBrand
            ? `${user.moverDetails.vehicleBrand} ${user.moverDetails.vehicleModel}`
            : t('booking:vehicle.addDetails.helper'),
          action: () => {
            setVehicleForm({
              vehicleBrand: user?.moverDetails?.vehicleBrand || '',
              vehicleModel: user?.moverDetails?.vehicleModel || '',
              vehicleYear: user?.moverDetails?.vehicleYear || '',
              vehicleCapacity: user?.moverDetails?.vehicleCapacity || '',
              vehicleRegistration: user?.moverDetails?.vehicleRegistration || '',
              vehicleType: user?.moverDetails?.vehicleType || '',
            })
            setError('')
            setActiveModal('editVehicle')
          },
        },
        {
          id: 'payouts',
          icon: CreditCardIcon,
          label: t('web:mover.settings.payouts.label'),
          description: t('web:mover.settings.payouts.helper'),
          action: () => {},
        },
      ],
    },
    {
      id: 'preferences',
      title: t('profile:section.preferences.title'),
      items: [
        {
          id: 'notifications',
          icon: BellIcon,
          label: t('profile:menu.notifications.label'),
          description: t('profile:notifications.helper'),
          action: () => {},
        },
        {
          id: 'privacy',
          icon: ShieldCheckIcon,
          label: t('profile:privacySecurity.label'),
          description: t('profile:privacySecurity.helper'),
          action: () => {},
        },
      ],
    },
    {
      id: 'support',
      title: t('profile:section.support.title'),
      items: [
        {
          id: 'help',
          icon: QuestionMarkCircleIcon,
          label: t('profile:helpCenter.header.title'),
          description: t('profile:helpCenter.helper'),
          action: () => {},
        },
      ],
    },
  ]

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {t('common:nav.settings.label')}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          {t('web:mover.settings.subtitle')}
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-4 rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}
      
      {/* Error banner */}
      {error && !activeModal && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              src={user?.profilePhoto || undefined}
              initials={!user?.profilePhoto ? initials : undefined}
              className="size-24 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-md disabled:opacity-50"
            >
              {isUploading ? (
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <CameraIcon className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {user?.fullName || t('common:person.fallbackMover.label')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {user?.email || 'email@example.com'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400">
                {t('web:mover.activeBadge.label')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section) => (
          <div key={section.id}>
            <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2 px-1">
              {section.title}
            </h3>
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm overflow-hidden">
              {section.items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`w-full flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors ${
                    index < section.items.length - 1
                      ? 'border-b border-neutral-100 dark:border-neutral-700'
                      : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {item.label}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-neutral-400" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full mt-8 flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        {t('common:action.logout.cta')}
      </button>

      {/* App Version */}
      <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-6">
        {t('web:mover.settings.version.label', { version: '1.0.0' })}
      </p>

      {/* ─── MODALS ────────────────────────────────────────── */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md relative">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <XMarkIcon className="w-5 h-5 text-neutral-400" />
            </button>

            {/* ── Edit Name ── */}
            {activeModal === 'editName' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  {t('profile:editName.title')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      {t('common:field.fullName.label')}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('common:field.fullName.placeholder')}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      {t('common:action.cancel.cta')}
                    </button>
                    <button
                      onClick={handleSaveName}
                      disabled={isSaving || !fullName.trim()}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? t('common:state.saving.label') : t('common:action.save.cta')}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Change Email ── */}
            {activeModal === 'changeEmail' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  {t('profile:changeEmail.title')}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                  {t('profile:changeEmail.current.label', { email: user?.email ?? '' })}
                </p>

                {emailStep === 'input' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        {t('profile:newEmail.label')}
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder={t('profile:newEmail.placeholder')}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <p className="text-xs text-neutral-400">
                      {t('profile:changeEmail.helperLong')}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={closeModal}
                        className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        {t('common:action.cancel.cta')}
                      </button>
                      <button
                        onClick={handleChangeEmail}
                        disabled={isSaving || !newEmail.trim()}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? t('common:state.updating.label') : t('profile:changeEmail.cta')}
                      </button>
                    </div>
                  </div>
                )}

                {emailStep === 'sent' && (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <EnvelopeIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300">
                      <Trans
                        i18nKey="profile:changeEmail.updatedTo.body"
                        values={{ email: newEmail }}
                        components={{ 1: <strong /> }}
                      />
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {t('profile:changeEmail.sentLong')}
                    </p>
                    <button
                      onClick={async () => {
                        closeModal()
                        await refreshProfile()
                      }}
                      className="px-6 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors"
                    >
                      {t('common:action.done.cta')}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── Change Phone ── */}
            {activeModal === 'changePhone' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  {t('profile:changePhone.title')}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                  {t('profile:changePhone.current.label', {
                    phone: user?.phone || t('common:value.notSet.empty'),
                  })}
                </p>

                {phoneStep === 'input' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        {t('profile:newPhone.label')}
                      </label>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder={t('profile:newPhone.placeholder')}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <p className="text-xs text-neutral-400">
                      {t('profile:changePhone.helperLong')}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={closeModal}
                        className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        {t('common:action.cancel.cta')}
                      </button>
                      <button
                        onClick={handleChangePhone}
                        disabled={isSaving || !newPhone.trim()}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? t('auth:otp.sendingOtp.cta') : t('auth:otp.sendShort.cta')}
                      </button>
                    </div>
                  </div>
                )}

                {phoneStep === 'verify' && (
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <PhoneIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                      <Trans
                        i18nKey="auth:otp.sentToInline.body"
                        values={{ phone: newPhone }}
                        components={[<strong key="0" />]}
                      />
                    </p>
                    <div>
                      <input
                        type="text"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder={t('auth:otp.input.placeholder', { count: 6 })}
                        maxLength={6}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent text-center text-lg tracking-widest focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setPhoneStep('input'); setError('') }}
                        className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        {t('common:action.back.cta')}
                      </button>
                      <button
                        onClick={handleVerifyPhoneOtp}
                        disabled={isSaving || phoneOtp.length < 6}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? t('auth:otp.verifying.cta') : t('auth:otp.verify.cta')}
                      </button>
                    </div>
                    <button
                      onClick={handleChangePhone}
                      disabled={isSaving}
                      className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                    >
                      {t('auth:otp.resend.cta')}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── Edit Vehicle ── */}
            {activeModal === 'editVehicle' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  {t('booking:vehicle.edit.title')}
                </h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        {t('booking:vehicle.brandShort.label')}
                      </label>
                      <input
                        type="text"
                        value={vehicleForm.vehicleBrand}
                        onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicleBrand: e.target.value }))}
                        placeholder={t('booking:vehicle.brand.placeholder')}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        {t('booking:vehicle.modelShort.label')}
                      </label>
                      <input
                        type="text"
                        value={vehicleForm.vehicleModel}
                        onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicleModel: e.target.value }))}
                        placeholder={t('booking:vehicle.model.placeholder')}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        {t('booking:vehicle.yearShort.label')}
                      </label>
                      <input
                        type="text"
                        value={vehicleForm.vehicleYear}
                        onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicleYear: e.target.value }))}
                        placeholder={t('booking:vehicle.year.placeholder')}
                        maxLength={4}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        {t('booking:vehicle.capacity.label')}
                      </label>
                      <input
                        type="text"
                        value={vehicleForm.vehicleCapacity}
                        onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicleCapacity: e.target.value }))}
                        placeholder={t('booking:vehicle.capacity.placeholder')}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      {t('booking:vehicle.registrationShort.label')}
                    </label>
                    <input
                      type="text"
                      value={vehicleForm.vehicleRegistration}
                      onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicleRegistration: e.target.value }))}
                      placeholder={t('booking:vehicle.registration.placeholder')}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      {t('booking:vehicle.type.label')}
                    </label>
                    <div className="space-y-2">
                      {/* i18n-keys: booking:vehicle.smallVan.label, booking:vehicle.smallVan.capacity, booking:vehicle.mediumTruck.label, booking:vehicle.mediumTruck.capacity, booking:vehicle.largeTruck.label, booking:vehicle.largeTruck.capacity */}
                      {VEHICLE_TYPE_SLUGS.map((v) => (
                        <label
                          key={v.value}
                          className={`flex cursor-pointer items-center rounded-xl border p-3 transition-colors ${
                            vehicleForm.vehicleType === v.value
                              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                              : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="vehicleTypeEdit"
                            value={v.value}
                            checked={vehicleForm.vehicleType === v.value}
                            onChange={() => setVehicleForm(prev => ({ ...prev, vehicleType: v.value }))}
                            className="sr-only"
                          />
                          <TruckIcon className="mr-3 h-5 w-5 flex-shrink-0 text-neutral-500" />
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {t(`booking:vehicle.${v.key}.label`)}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {t(`booking:vehicle.${v.key}.capacity`)}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      {t('common:action.cancel.cta')}
                    </button>
                    <button
                      onClick={handleSaveVehicle}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? t('common:state.saving.label') : t('common:action.saveChanges.cta')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
