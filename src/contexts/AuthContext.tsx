import React, { createContext, useContext, useState, useEffect, type ReactNode,  } from 'react'
import { authApi } from '../api/lib/authApi'

export interface User {
  id: string
  email: string
  role: 'admin' | 'manager' | 'user'
  name: string
    phone: string
    avatar: string | null
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
        console.log('User data from /auth/me:', userData)
        
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })
      console.log('Login response:', response)
      
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
