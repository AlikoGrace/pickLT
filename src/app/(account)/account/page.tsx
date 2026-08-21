'use client'

import { useAuth } from '@/context/auth'
import { account } from '@/lib/appwrite'
import { compressImage } from '@/utils/compressImage'
import Avatar from '@/shared/Avatar'
import {
  UserCircleIcon,
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
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'

const APP_VERSION = '1.0.0'
const OTP_DIGITS = 6

type ModalType = 'editName' | 'changeEmail' | 'changePhone' | null

export default function AccountPage() {
  const { t } = useTranslation()
  const { user, updateUser, logout, refreshProfile, isAuthenticated, isLoading } = useAuth()
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

  // Compute initials from user's full name
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

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
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        await account.createVerification(`${origin}/account`)
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
      await account.createPhoneVerification()
      setPhoneStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:profile.phoneNumberChangeFailed'))
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

  // If not loading and not authenticated, show sign-in prompt
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <UserCircleIcon className="w-16 h-16 text-neutral-300 mb-4" />
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          {t('web:account.signedOut.title')}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
          {t('web:account.signedOut.subtitle')}
        </p>
        <Link
          href="/login"
          className="px-6 py-2.5 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {t('auth:action.signIn.cta')}
        </Link>
      </div>
    )
  }

  const settingsSections = [
    {
      title: t('profile:section.account.title'),
      items: [
        {
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
          icon: CreditCardIcon,
          label: t('profile:paymentMethods.label'),
          description: t('profile:paymentMethods.helper'),
          action: () => {},
        },
      ],
    },
    {
      title: t('profile:section.moves.title'),
      items: [
        {
          icon: ClipboardDocumentListIcon,
          label: t('web:nav.myMoves.label'),
          description: t('web:account.myMoves.helper'),
          action: () => router.push('/account-savelists'),
        },
      ],
    },
    {
      title: t('profile:section.preferences.title'),
      items: [
        {
          icon: BellIcon,
          label: t('profile:menu.notifications.label'),
          description: t('profile:notifications.helper'),
          action: () => {},
        },
        {
          icon: ShieldCheckIcon,
          label: t('profile:privacy.label'),
          description: t('profile:privacy.helper'),
          action: () => {},
        },
      ],
    },
    {
      title: t('profile:section.support.title'),
      items: [
        {
          icon: QuestionMarkCircleIcon,
          label: t('profile:helpCenter.header.title'),
          description: t('profile:help.helper'),
          action: () => {},
        },
      ],
    },
  ]

  return (
    <div className="max-w-3xl mx-auto">
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
      <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar
              src={user?.profilePhoto || undefined}
              initials={!user?.profilePhoto ? initials : undefined}
              className="size-18 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-md disabled:opacity-50"
            >
              {isUploading ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
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
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {user?.fullName || t('common:person.unnamed.label')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {user?.email || 'email@example.com'}
            </p>
            {user?.phone && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {user.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">
              {section.title}
            </h3>
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm overflow-hidden">
              {section.items.map((item, index) => (
                <button
                  key={item.label}
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

      {/* Sign Out */}
      <button
        onClick={handleLogout}
        className="w-full mt-10 flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        {t('common:action.signOut.cta')}
      </button>

      <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-6 mb-8">
        {t('web:account.version.label', { version: APP_VERSION })}
      </p>

      {/* ─── MODALS ────────────────────────────────────────── */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <XMarkIcon className="w-5 h-5 text-neutral-400" />
            </button>

            {/* Edit Name */}
            {activeModal === 'editName' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  {t('profile:editName.title')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      {t('auth:field.fullName.label')}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('profile:editName.name.placeholder')}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
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

            {/* Change Email */}
            {activeModal === 'changeEmail' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  {t('profile:changeEmail.title')}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                  {t('profile:changeEmail.current.label', { email: user?.email })}
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
                      {t('profile:changeEmail.sent.body')}
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

            {/* Change Phone */}
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
                        placeholder="+233241234567"
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
                        {isSaving ? t('auth:otp.sending.cta') : t('auth:otp.sendCode.cta')}
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
                        i18nKey="auth:otp.sentTo.body"
                        values={{ phone: newPhone }}
                        components={{ 1: <strong /> }}
                      />
                    </p>
                    <input
                      type="text"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('auth:otp.input.placeholder', { count: OTP_DIGITS })}
                      maxLength={OTP_DIGITS}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent text-center text-lg tracking-widest focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                    />
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
          </div>
        </div>
      )}
    </div>
  )
}
