import React from 'react'
import { Search, Menu } from 'lucide-react'
import { NotificationDropdown } from '../common/NotificationDropdown'

interface HeaderProps {
  userName?: string
  userRole?: string
  profilePath?: string
}

const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="h-16 bg-slate-100 border-b border-slate-300 sticky top-0 z-10 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="inline-flex lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search pods, incidents, users..."
            className="w-64 lg:w-96 rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationDropdown />
      </div>
    </header>
  )
}

export default Header

