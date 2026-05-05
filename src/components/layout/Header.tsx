import React from 'react'
import { Menu } from 'lucide-react'
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


      </div>

      <div className="flex items-center gap-4">
        <NotificationDropdown />
      </div>
    </header>
  )
}

export default Header

