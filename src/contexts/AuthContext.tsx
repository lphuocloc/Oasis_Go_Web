/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'react-toastify'
import { authApi } from '../api/lib/authApi'
import { notificationApi } from '../api/notificationApi'
import { requestFcmToken, subscribeForegroundMessages } from '../lib/firebaseMessaging'

export interface User {
  id: string
  email: string
  role: 'admin' | 'manager' | 'user'
  name: string
  phone: string
  avatar: string | null
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const foregroundUnsubscribeRef = useRef<(() => void) | null>(null)
  const registeredTokenRef = useRef<string | null>(null)

  const checkAuth = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')

      if (!token) {
        console.log('No token found')
        localStorage.removeItem('user')
        setUser(null)
        setIsLoading(false)
        return
      }

      console.log('Token found, fetching user info...')
      // Small delay to ensure interceptor is ready
      await new Promise(resolve => setTimeout(resolve, 100))

      try {
        const userData = await authApi.me()

        if (userData && userData.id) {
          localStorage.setItem('user', JSON.stringify(userData))
          setUser(userData)
          console.log('User authenticated:', userData.name)
          return
        }
      } catch (apiError) {
        console.warn('Failed to fetch from /auth/me, trying fallback...', apiError)
        // Fallback: try to get user from localStorage
        const cachedUser = localStorage.getItem('user')
        if (cachedUser) {
          try {
            const userData = JSON.parse(cachedUser)
            setUser(userData)
            console.log('User restored from cache:', userData.name)
            return
          } catch (parseError) {
            console.error('Failed to parse cached user', parseError)
          }
        }
        throw apiError
      }

      console.warn('Invalid user data')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    } catch (error: any) {
      console.error('Auth check failed:', {
        status: error?.response?.status,
        message: error?.message,
        data: error?.response?.data
      })
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Check auth status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    let isCancelled = false

    if (!user) {
      registeredTokenRef.current = null
      foregroundUnsubscribeRef.current?.()
      foregroundUnsubscribeRef.current = null
      return
    }

    const setupFirebaseMessaging = async () => {
      try {
        const token = await requestFcmToken()
        if (!token || isCancelled) {
          return
        }

        console.log('[FCM] Web token generated:', token)

        if (registeredTokenRef.current !== token) {
          console.log('[FCM] Sending token to backend /auth/update-fcm-token:', token)
          const registerResult = await notificationApi.registerPushToken(token)
          console.log('[FCM] Backend register token response:', registerResult)
          registeredTokenRef.current = token
        }
      } catch (error) {
        console.error('Failed to setup Firebase Messaging', error)
      }

      try {
        const unsubscribe = await subscribeForegroundMessages((payload) => {
          if (isCancelled) return

          const title = payload.notification?.title || 'Thong bao moi'
          const body = payload.notification?.body || ''
          toast.info(body ? `${title}: ${body}` : title)
        })

        if (!isCancelled) {
          foregroundUnsubscribeRef.current = unsubscribe
        }
      } catch (error) {
        console.error('Failed to subscribe foreground notifications', error)
      }
    }

    setupFirebaseMessaging()

    return () => {
      isCancelled = true
      foregroundUnsubscribeRef.current?.()
      foregroundUnsubscribeRef.current = null
    }
  }, [user])

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })

      // Handle nested data structure
      const tokenData = response.data || response
      const token = tokenData.token
      const userData = tokenData.user

      if (!token || !userData) {
        throw new Error('Invalid login response: missing token or user data')
      }

      console.log('Storing token and user...')
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      console.log('Login successful for user:', userData.name)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = () => {
    const token = localStorage.getItem('token')
    if (token) {
      notificationApi.resetPushToken(token).catch((error) => {
        console.error('Failed to reset FCM token on logout', error)
      })
    }

    foregroundUnsubscribeRef.current?.()
    foregroundUnsubscribeRef.current = null
    registeredTokenRef.current = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
