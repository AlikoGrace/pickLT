'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import T from '@/utils/getT'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useRef } from 'react'
import type { JSX } from 'react'
import { PhotoIcon, TruckIcon, DocumentIcon, UserCircleIcon, CameraIcon } from '@heroicons/react/24/outline'

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

function SignupContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'client'
  const isMover = type === 'mover'

  // Form state
  const [fullName, setFullName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Mover-specific state
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [driversLicense, setDriversLicense] = useState<string | null>(null)
  const [driversLicenseFileName, setDriversLicenseFileName] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleRegistration, setVehicleRegistration] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')
  const [vehicleCapacity, setVehicleCapacity] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const profilePhotoRef = useRef<HTMLInputElement>(null)

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDriversLicenseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setDriversLicenseFileName(file.name)
      const reader = new FileReader()
      reader.onloadend = () => {
        setDriversLicense(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement actual signup logic
    console.log('Signup submitted', {
      type,
      fullName,
      contactNumber,
      email,
      password,
      ...(isMover && {
        profilePhoto,
        driversLicense,
        vehicleBrand,
        vehicleModel,
        vehicleRegistration,
        vehicleYear,
        vehicleCapacity,
      }),
    })
  }

  return (
    <div className="container pb-16">
      <div className="my-16 flex justify-center">
        <Logo className="w-32" />
      </div>

      <div className="mx-auto max-w-md space-y-6">
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

        {!isMover && (
          <>
            <div className="grid gap-3">
              {socials.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="flex w-full rounded-lg bg-primary-50 px-4 py-3 transition-transform hover:translate-y-0.5 dark:bg-neutral-800"
                >
                  <item.icon className="size-5 shrink-0" />
                  <h3 className="grow text-center text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {item.name}
                  </h3>
                </Link>
              ))}
            </div>
            {/* OR */}
            <div className="relative text-center">
              <span className="relative z-10 inline-block bg-white px-4 text-sm font-medium dark:bg-neutral-900 dark:text-neutral-400">
                OR
              </span>
              <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 transform border border-neutral-100 dark:border-neutral-800"></div>
            </div>
          </>
        )}

        {/* FORM */}
        <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
          {/* Common fields */}
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">Full Name</Label>
            <Input
              type="text"
              placeholder="John Doe"
              className="mt-1"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </Field>

          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{T['login']['Contact number']}</Label>
            <Input
              type="tel"
              placeholder="+49 345 456 3453"
              className="mt-1"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              required
            />
          </Field>

          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{T['login']['Email address']}</Label>
            <Input
              type="email"
              placeholder="example@example.com"
              className="mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">{T['login']['Password']}</Label>
            <Input
              type="password"
              className="mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">Confirm Password</Label>
            <Input
              type="password"
              className="mt-1"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Field>

          {/* Mover-specific fields */}
          {isMover && (
            <>
              {/* Profile Photo Section */}
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <UserCircleIcon className="h-5 w-5" />
                  Profile Photo
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Upload a clear photo of yourself for client identification
                </p>
              </div>

              {/* Profile Photo Upload */}
              <Field className="block">
                <div className="flex justify-center">
                  <input
                    ref={profilePhotoRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                  />
                  <div className="relative">
                    {profilePhoto ? (
                      <div className="relative">
                        <img
                          src={profilePhoto}
                          alt="Profile"
                          className="w-32 h-32 rounded-full object-cover border-4 border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => profilePhotoRef.current?.click()}
                          className="absolute bottom-0 right-0 p-2 bg-primary-600 rounded-full text-white hover:bg-primary-700 transition-colors shadow-lg"
                        >
                          <CameraIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => profilePhotoRef.current?.click()}
                        className="w-32 h-32 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex flex-col items-center justify-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors bg-neutral-50 dark:bg-neutral-800"
                      >
                        <CameraIcon className="h-8 w-8 text-neutral-400" />
                        <span className="mt-1 text-xs text-neutral-500">Add photo</span>
                      </button>
                    )}
                  </div>
                </div>
              </Field>

              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <DocumentIcon className="h-5 w-5" />
                  Verification Documents
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Upload your driver&apos;s license for verification
                </p>
              </div>

              {/* Driver's License Upload */}
              <Field className="block">
                <Label className="text-neutral-800 dark:text-neutral-200">Driver&apos;s License</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDriversLicenseUpload}
                    className="hidden"
                  />
                  {driversLicense ? (
                    <div className="relative rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                      <img
                        src={driversLicense}
                        alt="Driver's License"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 flex justify-between items-center">
                        <span className="text-white text-sm truncate">{driversLicenseFileName}</span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-white text-sm underline"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 p-8 text-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
                    >
                      <PhotoIcon className="mx-auto h-12 w-12 text-neutral-400" />
                      <span className="mt-2 block text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Click to upload driver&apos;s license
                      </span>
                      <span className="mt-1 block text-xs text-neutral-500">
                        PNG, JPG, GIF up to 10MB
                      </span>
                    </button>
                  )}
                </div>
              </Field>

              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <TruckIcon className="h-5 w-5" />
                  Vehicle Details
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Provide details about your moving vehicle
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field className="block">
                  <Label className="text-neutral-800 dark:text-neutral-200">Vehicle Brand</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Ford"
                    className="mt-1"
                    value={vehicleBrand}
                    onChange={(e) => setVehicleBrand(e.target.value)}
                    required
                  />
                </Field>

                <Field className="block">
                  <Label className="text-neutral-800 dark:text-neutral-200">Vehicle Model</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Transit"
                    className="mt-1"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field className="block">
                  <Label className="text-neutral-800 dark:text-neutral-200">Year</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 2022"
                    className="mt-1"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    required
                  />
                </Field>

                <Field className="block">
                  <Label className="text-neutral-800 dark:text-neutral-200">Capacity (m³)</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 15"
                    className="mt-1"
                    value={vehicleCapacity}
                    onChange={(e) => setVehicleCapacity(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <Field className="block">
                <Label className="text-neutral-800 dark:text-neutral-200">Registration Number</Label>
                <Input
                  type="text"
                  placeholder="e.g. ABC-1234"
                  className="mt-1"
                  value={vehicleRegistration}
                  onChange={(e) => setVehicleRegistration(e.target.value)}
                  required
                />
              </Field>
            </>
          )}

          <ButtonPrimary type="submit">{T['common']['Continue']}</ButtonPrimary>
        </form>

        {/* ==== */}
        <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
          {T['login']['Already have an account?']} {` `}
          <Link href={`/login?type=${type}`} className="font-medium underline">
            {T['login']['Sign in']}
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
