import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Search, Bell, LogOut, User, ChevronDown } from 'lucide-react'

interface HeaderProps {
  userName?: string
  userRole?: string
  profilePath?: string
}

const Header: React.FC<HeaderProps> = ({
  userName = 'Alex Morgan',
  userRole = 'Super Admin',
  profilePath = '/admin/profile'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const notifications = [
    { id: 1, message: 'New booking request', time: '5 mins ago', read: false },
    { id: 2, message: 'Maintenance completed', time: '1 hour ago', read: true },
    { id: 3, message: 'Pod reservation cancelled', time: '2 hours ago', read: true }
  ]

  const unreadCount = notifications.filter(n => !n.read).length

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Search functionality can be implemented here
    console.log('Search query:', searchQuery)
  }

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    navigate('/login')
  }

  const handleProfileClick = () => {
    navigate(profilePath)
    setShowUserMenu(false)
  }

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="flex items-center justify-between px-8 py-4 h-20">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search pods, incidents, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Right Section */}
        <div className="flex items-center gap-6 ml-8">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-white font-semibold">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 border-b border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer ${
                          !notif.read ? 'bg-gray-700' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className={`text-sm ${notif.read ? 'text-gray-400' : 'text-gray-100 font-medium'}`}>
                            {notif.message}
                          </p>
                          {!notif.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1 ml-2"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400">No notifications</div>
                  )}
                </div>
                <div className="p-3 border-t border-gray-700 bg-gray-900">
                  <button className="w-full text-center text-sm text-blue-500 hover:text-blue-400 font-medium">
                    View All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{(user?.name || userName).split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-white">{user?.name || userName}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role || userRole}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={handleProfileClick}
                  className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  View Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2 border-t border-gray-700"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
