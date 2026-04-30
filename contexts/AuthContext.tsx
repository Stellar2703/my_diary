"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authApi, setAuthToken, removeAuthToken, getAuthToken } from '@/lib/api'
import { toast } from 'sonner'

interface User {
  id: string
  userId: string // Alias for id for backward compatibility
  name: string
  username: string
  email: string
  mobile: string
  role: string
  avatar?: string
  bio?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isImpersonating: boolean
  originalUser: User | null
  login: (username: string, password: string) => Promise<boolean>
  register: (formData: FormData) => Promise<boolean>
  logout: () => void
  updateUser: (user: User) => void
  startImpersonation: (userData: any, token: string) => void
  stopImpersonation: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [originalUser, setOriginalUser] = useState<User | null>(null)
  const router = useRouter()

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      // Verify token with backend
      const response = await authApi.getProfile()
      if (response.success && response.data) {
        const userData: any = response.data
        setUser({
          id: String(userData.id),
          userId: String(userData.id),
          name: userData.name,
          username: userData.username,
          email: userData.email,
          mobile: userData.mobile || userData.mobileNumber || "",
          role: userData.role || "user",
          avatar: userData.avatar,
          bio: userData.bio,
        })
      } else {
        removeAuthToken()
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      removeAuthToken()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login(username, password)
      
      if (response.success && response.data) {
        const { token, user: userData } = response.data as { token: string; user: any }
        const user: User = {
          id: String(userData.id),
          userId: String(userData.id),
          name: userData.name,
          username: userData.username,
          email: userData.email,
          mobile: userData.mobile || userData.mobileNumber || "",
          role: userData.role || "user",
          avatar: userData.avatar,
          bio: userData.bio,
        }
        setAuthToken(token)
        setUser(user)
        toast.success('Login successful!')
        return true
      } else {
        toast.error(response.message || 'Login failed')
        return false
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
      return false
    }
  }

  const register = async (formData: FormData): Promise<boolean> => {
    try {
      const response = await authApi.register(formData)
      
      if (response.success && response.data) {
        const { token, user: userData } = response.data as { token: string; user: any }
        const user: User = {
          id: String(userData.id),
          userId: String(userData.id),
          name: userData.name,
          username: userData.username,
          email: userData.email,
          mobile: userData.mobile || userData.mobileNumber || "",
          role: userData.role || "user",
          avatar: userData.avatar,
          bio: userData.bio,
        }
        setAuthToken(token)
        setUser(user)
        toast.success('Registration successful!')
        return true
      } else {
        toast.error(response.message || 'Registration failed')
        return false
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
      return false
    }
  }

  const logout = () => {
    removeAuthToken()
    setUser(null)
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const updateUser = (userData: User) => {
    setUser(userData)
  }

  const startImpersonation = (userData: any, token: string) => {
    // Store current user as original
    setOriginalUser(user)
    // Set impersonated user
    const impersonatedUser: User = {
      id: String(userData.id),
      userId: String(userData.id),
      name: userData.name,
      username: userData.username,
      email: userData.email,
      mobile: userData.mobile || userData.mobileNumber || "",
      role: userData.role || "user",
      avatar: userData.avatar,
      bio: userData.bio,
    }
    setUser(impersonatedUser)
    setIsImpersonating(true)
    setAuthToken(token)
    toast.success(`Now impersonating ${userData.name}`)
  }

  const stopImpersonation = () => {
    if (originalUser) {
      setUser(originalUser)
      setOriginalUser(null)
      setIsImpersonating(false)
      toast.success('Stopped impersonation')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isImpersonating,
        originalUser,
        login,
        register,
        logout,
        updateUser,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
