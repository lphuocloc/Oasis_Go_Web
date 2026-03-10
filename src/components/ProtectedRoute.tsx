import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  requiredRoles?: Array<'admin' | 'manager' | 'user'>
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block"></div>
          <p className="text-gray-200 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block"></div>
          <p className="text-gray-200 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && user) {
    // Redirect to dashboard based on role
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />
    } else if (user.role === 'manager') {
      return <Navigate to="/manager" replace />
    }
  }

  return <Outlet />
}
