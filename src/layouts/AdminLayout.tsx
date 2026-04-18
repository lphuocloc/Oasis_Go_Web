import React from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from '../components/layout/AdminSidebar'
import Header from '../components/layout/Header'

export const AdminLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 transition-[margin] duration-300" style={{ marginLeft: 'var(--app-sidebar-width, 16rem)' }}>
        <Header />
        <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
