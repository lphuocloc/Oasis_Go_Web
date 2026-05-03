/* eslint-disable react-refresh/only-export-components */
import './App.css'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { CleaningTaskManagement } from './pages/admin/CleaningTaskManagement'
import { LocationManagement } from './pages/admin/LocationManagement'
import { PodClusterManagement } from './pages/admin/PodClusterManagement'
import { AdminPodManagement } from './pages/admin/PodManagement'
import { InventoryWarehouseManagement } from './pages/admin/InventoryWarehouseManagement'
import { AdminProfile } from './pages/admin/Profile'
import { AdminShiftManagement } from './pages/admin/ShiftManagement'
import { WithdrawManagement } from './pages/admin/WithdrawManagement'
import { StaffManagement } from './pages/admin/StaffManagement'
import { ReviewManagement } from './pages/admin/ReviewManagement'
import { BookingManagement as AdminBookingManagement } from './pages/admin/BookingManagement'
import { VoucherManagement } from './pages/admin/VoucherManagement'
import { LedgerManagement } from './pages/admin/LedgerManagement'
import { ManagerDashboard } from './pages/manager/ManagerDashboard'
import { ManagerProfile } from './pages/manager/Profile'
import { Login } from './pages/Login'
import { ClusterManagement } from './pages/manager/ClusterManagement'
import { PodManagement } from './pages/manager/PodManagement'
import { BookingManagement } from './pages/manager/BookingManagement'
import { CleaningManagement } from './pages/manager/CleaningManagement'
import { IncidentManagement } from './pages/manager/IncidentManagement'
import { ManagerShiftManagement } from './pages/manager/ShiftManagement'
import { LostAndFoundManagement } from './pages/manager/LostAndFoundManagement'
import { SupportManagement } from './pages/manager/SupportManagement'
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
        index: true,
        element: <Navigate to="/login" replace />
      },
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
            path: 'locations',
            element: <LocationManagement />
          },
          {
            path: 'pod-clusters',
            element: <PodClusterManagement />
          },
          {
            path: 'pods',
            element: <AdminPodManagement />
          },
          {
            path: 'inventory-warehouse',
            element: <InventoryWarehouseManagement />
          },
          {
            path: 'cleaning-tasks',
            element: <CleaningTaskManagement />
          },
          {
            path: 'shifts',
            element: <AdminShiftManagement />
          },
          {
            path: 'withdraw',
            element: <WithdrawManagement />
          },
          {
            path: "profile",
            element: <AdminProfile />
          },
          {
            path: 'staff',
            element: <StaffManagement />
          },
          {
            path: 'reviews',
            element: <ReviewManagement />
          },
          {
            path: 'bookings',
            element: <AdminBookingManagement />
          },
          {
            path: 'pricing',
            element: <VoucherManagement />
          },
          {
            path: 'ledger',
            element: <LedgerManagement />
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
            path: "shifts",
            element: <ManagerShiftManagement />
          },
          {
            path: "lost-found",
            element: <LostAndFoundManagement />
          },
          {
            path: 'support',
            element: <SupportManagement />
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
