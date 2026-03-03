import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { ManagerDashboard } from './pages/manager/ManagerDashboard'
import { Login } from './pages/Login'


export const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminDashboard />
    // element: <AdminLayout />,
    // children: [
    //   { index: true, element: <AdminDashboard /> }
    // ]
  },
  {
    path: "/manager",
    element: <ManagerDashboard />
    // element: <ManagerLayout />,
    // children: [
    //   { index: true, element: <ManagerDashboard /> }
    // ]
  },
  {
    path: "/login",
    element: <Login />
  }
])

function App() {
  return (
    <RouterProvider router={router} />
  )
}

export default App
