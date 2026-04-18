import React, { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react'

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

const Sidebar: React.FC<SidebarProps> = ({
  navItems,
  userName = 'Alex Morgan',
  userRole = 'Super Admin',
  profilePath = '/admin/profile'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('oasis-sidebar-collapsed') === 'true'
  })

  const defaultNavItems: NavItem[] = []
  const finalNavItems = navItems.length > 0 ? navItems : defaultNavItems

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.localStorage.setItem('oasis-sidebar-collapsed', String(isCollapsed))
    document.documentElement.style.setProperty('--app-sidebar-width', isCollapsed ? '5rem' : '16rem')
  }, [isCollapsed])

  return (
    <aside className={`fixed left-0 top-0 z-20 flex h-screen flex-col border-r border-slate-800 bg-[#0b1730] text-slate-200 transition-[width] duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex h-16 items-center border-b border-slate-800 ${isCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'}`}>
        <div className="flex items-center gap-2.5 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <ShieldCheck size={18} className="text-white" />
          </div>
          {!isCollapsed && <span className="text-xl font-bold tracking-tight leading-none">Oasis Go</span>}
        </div>

        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="mx-auto mt-3 inline-flex rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      <nav className={`scrollbar-hidden flex-1 space-y-1 overflow-y-auto py-5 ${isCollapsed ? 'px-2' : 'px-1.5'}`}>
        {finalNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin' || item.path === '/manager' || item.path === '/'}
            className={({ isActive }) =>
              `mx-0.5 flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} ${isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-200/85 hover:bg-[#162447] hover:text-white'
              }`
            }
            title={isCollapsed ? item.label : undefined}
          >
            <span className="flex shrink-0 items-center justify-center text-slate-300 [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <Link to={profilePath} className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <img
            src="https://picsum.photos/42/42"
            alt="User avatar"
            className="h-10 w-10 rounded-full ring-2 ring-slate-700"
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="truncate text-sm text-slate-400">{userRole}</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  )
}

export default Sidebar
