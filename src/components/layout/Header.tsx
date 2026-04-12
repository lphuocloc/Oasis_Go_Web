import React from 'react'
import { Bell, Search, Menu } from 'lucide-react'

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
        <button
          type="button"
          className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-200"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
        </button>
      </div>
    </header>
  )
}

export default Header
