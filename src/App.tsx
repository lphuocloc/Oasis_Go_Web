import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminProfile } from './pages/admin/Profile'
import { ManagerDashboard } from './pages/manager/ManagerDashboard'
import { ManagerProfile } from './pages/manager/Profile'
import { Login } from './pages/Login'
import { ClusterManagement } from './pages/manager/ClusterManagement'
import { PodManagement } from './pages/manager/PodManagement'
import { BookingManagement } from './pages/manager/BookingManagement'
import { CleaningManagement } from './pages/manager/CleaningManagement'
import { IncidentManagement } from './pages/manager/IncidentManagement'
import { LostAndFoundManagement } from './pages/manager/LostAndFoundManagement'
import { AdminLayout } from './layouts/AdminLayout'
import { ManagerLayout } from './layouts/ManagerLayout'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicRoute />,
    children: [
      {
        path: "login",
        element: <Login />
      }
    ]
  },
  // Admin routes
  {
    path: "/admin",
    element: <ProtectedRoute requiredRoles={['admin']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboard />
          },
          {
            path: "profile",
            element: <AdminProfile />
          }
        ]
      }
    ]
  },
  // Manager routes
  {
    path: "/manager",
    element: <ProtectedRoute requiredRoles={['manager']} />,
    children: [
      {
        element: <ManagerLayout />,
        children: [
          {
            index: true,
            element: <ManagerDashboard />
          },
          {
            path: "clusters",
            element: <ClusterManagement />
          },
          {
            path: "pods",
            element: <PodManagement />
          },
          {
            path: "bookings",
            element: <BookingManagement />
          },
          {
            path: "maintenance",
            element: <CleaningManagement />
          },
          {
            path: "incidents",
            element: <IncidentManagement />
          },
          {
            path: "lost-found",
            element: <LostAndFoundManagement />
          },
          {
            path: "profile",
            element: <ManagerProfile />
          }
        ]
      }
    ]
  }
])

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
