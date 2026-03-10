import React from 'react'
import { Outlet } from 'react-router-dom'
import ManagerSidebar from '../components/layout/ManagerSidebar'
import Header from '../components/layout/Header'

export const ManagerLayout: React.FC = () => {
  return (
    <div className="flex h-screen">
      <ManagerSidebar />
      <div className="flex flex-col flex-1">
        <Header profilePath="/manager/profile" />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
