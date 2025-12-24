"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserType = 'client' | 'mover'

export type User = {
  id: string
  fullName: string
  email: string
  phone: string
  profilePhoto?: string
  userType: UserType
  // Mover-specific fields
  moverDetails?: {
    driversLicense?: string
    vehicleBrand?: string
    vehicleModel?: string
    vehicleYear?: string
    vehicleCapacity?: string
    vehicleRegistration?: string
    rating?: number
    totalMoves?: number
    yearsExperience?: number
    verified?: boolean
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
  login: (user: User) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  setUserType: (type: UserType) => void
  addCrewMember: (member: CrewMember) => void
  updateCrewMember: (id: string, updates: Partial<CrewMember>) => void
  removeCrewMember: (id: string) => void
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
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  setUserType: () => {},
  addCrewMember: () => {},
  updateCrewMember: () => {},
  removeCrewMember: () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userType, setUserType] = useState<UserType>('client')
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('picklt_user')
    const storedCrew = localStorage.getItem('picklt_crew')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        setIsAuthenticated(true)
        setUserType(parsedUser.userType || 'client')
      } catch (e) {
        console.error('Failed to parse stored user:', e)
      }
    }
    if (storedCrew) {
      try {
        setCrewMembers(JSON.parse(storedCrew))
      } catch (e) {
        console.error('Failed to parse stored crew:', e)
      }
    }
    setIsLoading(false)
  }, [])

  // Persist user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('picklt_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('picklt_user')
    }
  }, [user])

  // Persist crew to localStorage
  useEffect(() => {
    if (crewMembers.length > 0) {
      localStorage.setItem('picklt_crew', JSON.stringify(crewMembers))
    } else {
      localStorage.removeItem('picklt_crew')
    }
  }, [crewMembers])

  const login = (userData: User) => {
    setUser(userData)
    setIsAuthenticated(true)
    setUserType(userData.userType)
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    setUserType('client')
    localStorage.removeItem('picklt_user')
    localStorage.removeItem('picklt_crew')
  }

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null))
  }

  const addCrewMember = (member: CrewMember) => {
    setCrewMembers((prev) => [...prev, member])
  }

  const updateCrewMember = (id: string, updates: Partial<CrewMember>) => {
    setCrewMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    )
  }

  const removeCrewMember = (id: string) => {
    setCrewMembers((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        userType,
        crewMembers,
        login,
        logout,
        updateUser,
        setUserType,
        addCrewMember,
        updateCrewMember,
        removeCrewMember,
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
