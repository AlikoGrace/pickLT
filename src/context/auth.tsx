"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { account } from '@/lib/appwrite'
import { OAuthProvider } from 'appwrite'
import { exchangeGoogleIdToken } from '@/lib/googleauth-client'
import type { UserDoc, MoverProfileDoc, CrewMemberDoc } from '@/lib/types'
// Non-component `t` (see src/lib/i18n-runtime.ts): these throws happen inside
// callbacks, not in render, so there is no hook to read from here.
import { t } from '@/lib/i18n-runtime'

export type UserType = 'client' | 'mover'

/** localStorage key the sign-up page writes the chosen country to, read once by the first sync. */
export const PENDING_COUNTRY_KEY = 'picklt_pending_country'

// The user shape consumed across the app — combines Appwrite auth + Appwrite profile
export type User = {
  // Appwrite Auth user ID
  authId: string
  // Appwrite doc ID (from users collection)
  appwriteId: string | null
  fullName: string
  email: string
  phone: string
  profilePhoto?: string
  userType: UserType
  emailVerified: boolean
  phoneVerified: boolean
  /** ISO-3166-1 alpha-2 chosen at sign-up / in the account page (plan wave-2026-10/4 C7). */
  countryCode?: string | null
  // Mover-specific fields (loaded from mover_profiles)
  moverDetails?: {
    profileId: string
    driversLicense?: string
    driversLicensePhoto?: string
    socialSecurityNumber?: string
    taxNumber?: string
    primaryCity?: string
    primaryCountry?: string
    vehicleBrand?: string
    vehicleModel?: string
    vehicleYear?: string
    vehicleCapacity?: string
    vehicleRegistration?: string
    vehicleType?: string
    rating?: number
    totalMoves?: number
    yearsExperience?: number
    verificationStatus?: string
    isOnline?: boolean
    languages?: string[]
    // Vehicle entity pointer + rental confirmation (master §4.3). Read by
    // `vehicleServiceReady` / `vehicleServiceState` for the dashboard gates.
    vehicleOwnership?: 'owned' | 'rented'
    vehicleStatus?: 'none' | 'pending_review' | 'verified' | 'rejected'
    currentVehicleId?: string | null
    vehicleConfirmedServiceDate?: string | null
    vehicleReconfirmRequired?: boolean
    // Rental window of the vehicle in service + the owned fallback (plan wave-2026-10/1).
    vehicleRentalStartAt?: string | null
    vehicleRentalEndAt?: string | null
    vehicleRentalHours?: number | null
    ownedVehicleId?: string | null
    countryCode?: string | null
    // Fee-balance snapshot (plan fees/0.master.md §11); legacy rows read as ok.
    feeOwedCents?: number
    feeOldestDueAt?: string | null
    feeStanding?: 'ok' | 'due' | 'overdue' | 'restricted'
  }
}

export type CrewMember = {
  id: string
  name: string
  phone: string
  photo?: string
  role: 'driver' | 'helper'
  isActive: boolean
}

type AuthState = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  userType: UserType
  crewMembers: CrewMember[]
}

type AuthActions = {
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  setUserType: (type: UserType) => void
  /** `background`: a failed refresh keeps the current user instead of clearing it. */
  refreshProfile: (opts?: { background?: boolean }) => Promise<void>
  addCrewMember: (member: CrewMember) => void
  updateCrewMember: (id: string, updates: Partial<CrewMember>) => void
  removeCrewMember: (id: string) => void
  loginWithGoogle: (redirectTo?: string, intendedUserType?: UserType) => void
  /**
   * Google sign-in through the `googleauth` function (same path as the mobile
   * apps): exchanges a Google ID token for a session. Rejects with a
   * `GoogleAuthError` (see `googleAuthErrorKey`) when the function refuses.
   */
  loginWithGoogleIdToken: (idToken: string, intendedUserType?: UserType) => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  signupWithEmail: (email: string, password: string, name: string, intendedUserType?: UserType) => Promise<void>
  // Phone verification (mandatory step after Google/Email auth)
  setPhoneForVerification: (phone: string) => Promise<void>
  sendPhoneVerification: () => Promise<void>
  confirmPhoneVerification: (userId: string, secret: string) => Promise<void>
}

const defaultState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  userType: 'client',
  crewMembers: [],
}

const AuthContext = createContext<AuthState & AuthActions>({
  ...defaultState,
  logout: () => {},
  updateUser: () => {},
  setUserType: () => {},
  refreshProfile: async () => {},
  addCrewMember: () => {},
  updateCrewMember: () => {},
  removeCrewMember: () => {},
  loginWithGoogle: () => {},
  loginWithGoogleIdToken: async () => {},
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  setPhoneForVerification: async () => {},
  sendPhoneVerification: async () => {},
  confirmPhoneVerification: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userType, setUserType] = useState<UserType>('client')
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])

  // Check the current Appwrite session and sync profile
  const loadSession = useCallback(async (opts?: { background?: boolean }) => {
    try {
      const appwriteUser = await account.get()

      // Initialize server-side session cookie on our domain
      // (the Appwrite SDK session cookie lives on Appwrite's domain and
      //  is not accessible to our Next.js API routes or middleware)
      try {
        // Prove ownership of the session with a short-lived Appwrite JWT; the
        // route resolves it server-side and signs our cookie for that user.
        const { jwt } = await account.createJWT()
        const initRes = await fetch('/api/auth/init-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jwt }),
        })
        if (!initRes.ok) {
          const detail = await initRes.json().catch(() => ({}))
          console.warn('[auth] init-session failed', initRes.status, detail?.error ?? '')
        }
      } catch (e) {
        console.warn('Failed to initialize server session cookie', e)
      }

      // Check for pending user type from Google OAuth or email signup
      const pendingUserType = typeof window !== 'undefined'
        ? localStorage.getItem('picklt_pending_user_type') || undefined
        : undefined
      // The country chosen on the sign-up page (plan wave-2026-10/4 C7) rides
      // along on the first sync, the same way as the pending user type.
      const pendingCountry = typeof window !== 'undefined'
        ? localStorage.getItem(PENDING_COUNTRY_KEY) || undefined
        : undefined

      // Sync with our users collection via API
      const res = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: appwriteUser.$id,
          email: appwriteUser.email || '',
          fullName: appwriteUser.name || '',
          phone: appwriteUser.phone || '',
          emailVerified: appwriteUser.emailVerification ?? false,
          phoneVerified: appwriteUser.phoneVerification ?? false,
          userType: pendingUserType,
          countryCode: pendingCountry,
        }),
      })

      // Clear the pending user type after sync
      if (pendingUserType && typeof window !== 'undefined') {
        localStorage.removeItem('picklt_pending_user_type')
      }
      if (pendingCountry && typeof window !== 'undefined') {
        localStorage.removeItem(PENDING_COUNTRY_KEY)
      }

      if (!res.ok) throw new Error(t('errors:auth.syncFailed'))

      const data = await res.json()
      const userDoc: UserDoc = data.user
      const moverProfile: MoverProfileDoc | null = data.moverProfile ?? null
      const crewData: CrewMemberDoc[] = data.crewMembers ?? []

      const mappedUser: User = {
        authId: appwriteUser.$id,
        appwriteId: userDoc.$id,
        fullName: userDoc.fullName,
        email: userDoc.email,
        phone: userDoc.phone ?? '',
        profilePhoto: userDoc.profilePhoto ?? undefined,
        userType: (userDoc.userType as UserType) ?? 'client',
        emailVerified: userDoc.emailVerified ?? false,
        phoneVerified: userDoc.phoneVerified ?? false,
        countryCode: userDoc.countryCode ?? null,
        ...(moverProfile && {
          moverDetails: {
            profileId: moverProfile.$id,
            driversLicense: moverProfile.driversLicense ?? undefined,
            driversLicensePhoto: moverProfile.driversLicensePhoto ?? undefined,
            socialSecurityNumber: moverProfile.socialSecurityNumber ?? undefined,
            taxNumber: moverProfile.taxNumber ?? undefined,
            primaryCity: moverProfile.primaryCity ?? undefined,
            primaryCountry: moverProfile.primaryCountry ?? undefined,
            vehicleBrand: moverProfile.vehicleBrand ?? undefined,
            vehicleModel: moverProfile.vehicleModel ?? undefined,
            vehicleYear: moverProfile.vehicleYear ?? undefined,
            vehicleCapacity: moverProfile.vehicleCapacity ?? undefined,
            vehicleRegistration: moverProfile.vehicleRegistration ?? undefined,
            vehicleType: moverProfile.vehicleType ?? undefined,
            rating: moverProfile.rating ?? undefined,
            totalMoves: moverProfile.totalMoves ?? undefined,
            yearsExperience: moverProfile.yearsExperience ?? undefined,
            verificationStatus: moverProfile.verificationStatus ?? undefined,
            isOnline: moverProfile.isOnline ?? undefined,
            languages: moverProfile.languages ?? undefined,
            // Defaults match the backfill (D14): a legacy row is an owned
            // driver with no vehicle entity yet.
            vehicleOwnership: moverProfile.vehicleOwnership === 'rented' ? 'rented' : 'owned',
            vehicleStatus: moverProfile.vehicleStatus ?? 'none',
            currentVehicleId: moverProfile.currentVehicleId ?? null,
            vehicleConfirmedServiceDate: moverProfile.vehicleConfirmedServiceDate ?? null,
            vehicleReconfirmRequired: moverProfile.vehicleReconfirmRequired === true,
            vehicleRentalStartAt: moverProfile.vehicleRentalStartAt ?? null,
            vehicleRentalEndAt: moverProfile.vehicleRentalEndAt ?? null,
            vehicleRentalHours: moverProfile.vehicleRentalHours ?? null,
            ownedVehicleId: moverProfile.ownedVehicleId ?? null,
            countryCode: moverProfile.countryCode ?? null,
            feeOwedCents: moverProfile.feeOwedCents ?? 0,
            feeOldestDueAt: moverProfile.feeOldestDueAt ?? null,
            feeStanding: moverProfile.feeStanding ?? 'ok',
          },
        }),
      }

      setUser(mappedUser)
      setUserType(mappedUser.userType)

      // Map crew members
      if (crewData.length > 0) {
        setCrewMembers(
          crewData.map((c) => ({
            id: c.$id,
            name: c.name ?? '',
            phone: c.phone ?? '',
            photo: c.photo ?? undefined,
            role: (c.role as 'driver' | 'helper') ?? 'helper',
            isActive: c.isActive ?? true,
          }))
        )
      }
    } catch {
      // No active session or sync failed. A background refresh (the mover
      // dashboard's visibility/interval poll) keeps the user it already has:
      // a network blip must not sign a driver out in the middle of a move.
      if (!opts?.background) setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load session on mount
  useEffect(() => {
    loadSession()
  }, [loadSession])

  // ─── Auth Methods ─────────────────────────────────────

  const loginWithGoogle = (redirectTo?: string, intendedUserType?: UserType) => {
    // Store the intended user type so we can pick it up after OAuth redirect
    if (intendedUserType && typeof window !== 'undefined') {
      localStorage.setItem('picklt_pending_user_type', intendedUserType)
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    // Build the OAuth success URL: land on /login so the session can be initialised
    // and phone-verification can proceed before hitting protected routes.
    const typeParam = intendedUserType ? `type=${intendedUserType}` : 'type=client'
    const redirectParam = redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : ''
    const successUrl = `${origin}/login?${typeParam}${redirectParam}`
    const failureUrl = `${origin}/login?${typeParam}${redirectParam}`
    account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl)
  }

  /**
   * Google sign-in via `googleauth` (parity with `pickltmobile/lib/oauth.ts`).
   * Unlike the hosted flow above there is no redirect: the GIS button hands us
   * an ID token, the function finds-or-creates the Appwrite user by e-mail and
   * mints `{ userId, secret }`, and the session is created right here. That is
   * what lets an account the mobile app created sign in on the web.
   */
  const loginWithGoogleIdToken = async (idToken: string, intendedUserType?: UserType) => {
    if (intendedUserType && typeof window !== 'undefined') {
      localStorage.setItem('picklt_pending_user_type', intendedUserType)
    }
    const { userId, secret } = await exchangeGoogleIdToken(idToken, intendedUserType ?? 'client')
    // Appwrite refuses to create a session while one is active; drop a stale
    // one first (the mobile client does the same).
    try {
      await account.deleteSession('current')
    } catch {
      // No active session — the normal case.
    }
    await account.createSession({ userId, secret })
    await loadSession()
  }

  const loginWithEmail = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password)
    await loadSession()
  }

  const signupWithEmail = async (email: string, password: string, name: string, intendedUserType?: UserType) => {
    // Store the intended user type so loadSession picks it up
    if (intendedUserType && typeof window !== 'undefined') {
      localStorage.setItem('picklt_pending_user_type', intendedUserType)
    }
    await account.create('unique()', email, password, name)
    await account.createEmailPasswordSession(email, password)
    await loadSession()
  }

  /**
   * Step 1: Set phone on the Appwrite auth account via admin API
   * (needed because account.updatePhone requires password, which Google OAuth users don't have)
   */
  const setPhoneForVerification = async (phone: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`
    const res = await fetch('/api/auth/set-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formattedPhone }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || t('errors:auth.setPhoneFailed'))
    }
  }

  /**
   * Step 2: Trigger SMS OTP to the phone number that was set in step 1.
   * Uses Appwrite's built-in phone verification which sends via the configured Twilio provider.
   */
  const sendPhoneVerification = async () => {
    await account.createPhoneVerification()
  }

  /**
   * Step 3: Confirm the OTP code the user received.
   */
  const confirmPhoneVerification = async (userId: string, secret: string) => {
    await account.updatePhoneVerification(userId, secret)
    await loadSession() // reload to pick up phoneVerified = true
  }

  const logout = async () => {
    try {
      await account.deleteSession('current')
    } catch {
      // Session may already be expired
    }
    // Clear our server-side session cookie
    try {
      await fetch('/api/auth/clear-session', { method: 'POST' })
    } catch {
      // Best-effort
    }
    setUser(null)
    setUserType('client')
    setCrewMembers([])
  }

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null))
  }

  const refreshProfile = async (opts?: { background?: boolean }) => {
    await loadSession(opts)
  }

  const addCrewMember = (member: CrewMember) => {
    setCrewMembers((prev) => [...prev, member])
  }

  const updateCrewMember = (id: string, updates: Partial<CrewMember>) => {
    setCrewMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
  }

  const removeCrewMember = (id: string) => {
    setCrewMembers((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        userType,
        crewMembers,
        logout,
        updateUser,
        setUserType,
        refreshProfile,
        addCrewMember,
        updateCrewMember,
        removeCrewMember,
        loginWithGoogle,
        loginWithGoogleIdToken,
        loginWithEmail,
        signupWithEmail,
        setPhoneForVerification,
        sendPhoneVerification,
        confirmPhoneVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
