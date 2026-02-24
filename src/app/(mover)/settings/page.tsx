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

type ModalType = 'editName' | 'changeEmail' | 'changePhone' | null

const SettingsPage = () => {
  const { user, updateUser, logout, refreshProfile } = useAuth()
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
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
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
        throw new Error(data.error || 'Upload failed')
      }

      const { photoUrl } = await res.json()
      updateUser({ profilePhoto: photoUrl })
      setSuccess('Photo updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo')
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
        throw new Error(data.error || 'Failed to update name')
      }
      updateUser({ fullName: fullName.trim() })
      await refreshProfile()
      setActiveModal(null)
      setSuccess('Name updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
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
        throw new Error(data.error || 'Failed to change email')
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
      setError(err instanceof Error ? err.message : 'Failed to change email')
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
        throw new Error(data.error || 'Failed to change phone')
      }

      // Send OTP to the new phone number
      await account.createPhoneVerification()
      setPhoneStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change phone number')
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
      setSuccess('Phone number updated and verified')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code')
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

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: PencilSquareIcon,
          label: 'Edit Name',
          description: user?.fullName || 'Update your name',
          action: () => {
            setFullName(user?.fullName || '')
            setError('')
            setActiveModal('editName')
          },
        },
        {
          icon: EnvelopeIcon,
          label: 'Change Email',
          description: user?.email || 'Update your email address',
          action: () => {
            setNewEmail('')
            setEmailStep('input')
            setError('')
            setActiveModal('changeEmail')
          },
        },
        {
          icon: PhoneIcon,
          label: 'Change Phone',
          description: user?.phone || 'Update your phone number',
          action: () => {
            setNewPhone('')
            setPhoneOtp('')
            setPhoneStep('input')
            setError('')
            setActiveModal('changePhone')
          },
        },
        {
          icon: TruckIcon,
          label: 'Vehicle Information',
          description: user?.moverDetails?.vehicleBrand 
            ? `${user.moverDetails.vehicleBrand} ${user.moverDetails.vehicleModel}` 
            : 'Add your vehicle details',
          action: () => {},
        },
        {
          icon: CreditCardIcon,
          label: 'Payment Methods',
          description: 'Manage payout accounts',
          action: () => {},
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: BellIcon,
          label: 'Notifications',
          description: 'Configure alerts and notifications',
          action: () => {},
        },
        {
          icon: ShieldCheckIcon,
          label: 'Privacy & Security',
          description: 'Manage your data and security',
          action: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: QuestionMarkCircleIcon,
          label: 'Help Center',
          description: 'Get help and support',
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
          Settings
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Manage your account and preferences
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
              className=" size-24 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
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
              {user?.fullName || 'Mover Name'}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {user?.email || 'email@example.com'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400">
                Active Mover
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2 px-1">
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

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full mt-8 flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        Sign Out
      </button>

      {/* App Version */}
      <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-6">
        pickLT Mover App v1.0.0
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
                  Edit Name
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
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
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveName}
                      disabled={isSaving || !fullName.trim()}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Change Email ── */}
            {activeModal === 'changeEmail' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  Change Email
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                  Current: {user?.email}
                </p>

                {emailStep === 'input' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        New Email Address
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new@example.com"
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <p className="text-xs text-neutral-400">
                      A verification email will be sent to the new address.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={closeModal}
                        className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleChangeEmail}
                        disabled={isSaving || !newEmail.trim()}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Updating...' : 'Update Email'}
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
                      Email updated to <strong>{newEmail}</strong>
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      A verification email has been sent. Please check your inbox and click the verification link.
                    </p>
                    <button
                      onClick={async () => {
                        closeModal()
                        await refreshProfile()
                      }}
                      className="px-6 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── Change Phone ── */}
            {activeModal === 'changePhone' && (
              <>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                  Change Phone Number
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                  Current: {user?.phone || 'Not set'}
                </p>

                {phoneStep === 'input' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        New Phone Number
                      </label>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+491234567890"
                        className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <p className="text-xs text-neutral-400">
                      An OTP code will be sent to verify the new number.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={closeModal}
                        className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleChangePhone}
                        disabled={isSaving || !newPhone.trim()}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Sending OTP...' : 'Send OTP'}
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
                      Enter the verification code sent to <strong>{newPhone}</strong>
                    </p>
                    <div>
                      <input
                        type="text"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit code"
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
                        Back
                      </button>
                      <button
                        onClick={handleVerifyPhoneOtp}
                        disabled={isSaving || phoneOtp.length < 6}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                    <button
                      onClick={handleChangePhone}
                      disabled={isSaving}
                      className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                    >
                      Resend code
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

export default SettingsPage
