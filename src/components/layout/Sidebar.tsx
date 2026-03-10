import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface SidebarProps {
  navItems: NavItem[]
  userName?: string
  userRole?: string
  profilePath?: string
}

const Sidebar: React.FC<SidebarProps> = ({ navItems }) => {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const defaultNavItems: NavItem[] = []
  const finalNavItems = navItems.length > 0 ? navItems : defaultNavItems
  const isActive = (path: string) => location.pathname === path

  return (
    <div className={`flex flex-col h-screen bg-gray-900 transition-all duration-300 ${collapsed ? 'w-auto' : 'w-64'} border-r border-gray-800`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 h-20">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center ">
              <span className="text-white font-bold">GO</span>
            </div>
            <span className="text-white font-bold text-lg">Oasis Go</span>
          </div>
        )}
        {/* {collapsed && (
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">GO</span>
          </div>
        )} */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {finalNavItems.map((item) => {
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              title={collapsed ? item.label : ''}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default Sidebar
