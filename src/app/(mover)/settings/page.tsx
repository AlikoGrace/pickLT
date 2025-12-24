'use client'

import { useAuth } from '@/context/auth'
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
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

const SettingsPage = () => {
  const { user, updateUser, logout } = useAuth()
  const router = useRouter()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        updateUser({ profilePhoto: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: UserCircleIcon,
          label: 'Edit Profile',
          description: 'Update your personal information',
          action: () => setIsEditingProfile(true),
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
    <div className="p-4 lg:p-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Settings
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700">
              {user?.profilePhoto ? (
                <Image
                  src={user.profilePhoto}
                  alt={user.fullName}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              ) : (
                <UserCircleIcon className="w-full h-full text-neutral-400" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-md"
            >
              <CameraIcon className="w-4 h-4" />
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
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
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

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Edit Profile
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, fullName: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateUser({
                    fullName: profileData.fullName,
                    email: profileData.email,
                  })
                  setIsEditingProfile(false)
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
