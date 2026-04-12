import React from 'react'
import { Outlet } from 'react-router-dom'
import ManagerSidebar from '../components/layout/ManagerSidebar'
import Header from '../components/layout/Header'
import { ManagerScopeProvider } from '../contexts/ManagerScopeContext'

export const ManagerLayout: React.FC = () => {
  return (
    <ManagerScopeProvider>
      <div className="flex min-h-screen bg-slate-50">
        <ManagerSidebar />
        <div className="flex flex-col flex-1 min-w-0 transition-[margin] duration-300" style={{ marginLeft: 'var(--app-sidebar-width, 16rem)' }}>
          <Header profilePath="/manager/profile" />
          <div className="flex-1 overflow-auto p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </ManagerScopeProvider>
  )
}
