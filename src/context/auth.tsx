"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { account } from '@/lib/appwrite'
import { OAuthProvider } from 'appwrite'
import type { UserDoc, MoverProfileDoc, CrewMemberDoc } from '@/lib/types'

export type UserType = 'client' | 'mover'

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
    baseRate?: number
    languages?: string[]
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
  refreshProfile: () => Promise<void>
  addCrewMember: (member: CrewMember) => void
  updateCrewMember: (id: string, updates: Partial<CrewMember>) => void
  removeCrewMember: (id: string) => void
  loginWithGoogle: (redirectTo?: string) => void
  loginWithEmail: (email: string, password: string) => Promise<void>
  signupWithEmail: (email: string, password: string, name: string) => Promise<void>
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
  const loadSession = useCallback(async () => {
    try {
      const appwriteUser = await account.get()

      // Initialize server-side session cookie on our domain
      // (the Appwrite SDK session cookie lives on Appwrite's domain and
      //  is not accessible to our Next.js API routes or middleware)
      try {
        await fetch('/api/auth/init-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: appwriteUser.$id }),
        })
      } catch {
        console.warn('Failed to initialize server session cookie')
      }

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
        }),
      })

      if (!res.ok) throw new Error('Failed to sync user')

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
            baseRate: moverProfile.baseRate ?? undefined,
            languages: moverProfile.languages ?? undefined,
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
      // No active session or sync failed
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load session on mount
  useEffect(() => {
    loadSession()
  }, [loadSession])

  // ─── Auth Methods ─────────────────────────────────────

  const loginWithGoogle = (redirectTo?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const successUrl = redirectTo ? `${origin}${redirectTo}` : `${origin}/`
    const failureUrl = `${origin}/login`
    account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl)
  }

  const loginWithEmail = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password)
    await loadSession()
  }

  const signupWithEmail = async (email: string, password: string, name: string) => {
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
      throw new Error(data.error || 'Failed to set phone number')
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

  const refreshProfile = async () => {
    await loadSession()
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
