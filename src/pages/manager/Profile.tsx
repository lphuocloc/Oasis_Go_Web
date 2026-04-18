import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { userApi } from '../../api/lib/userApi'
import { Edit2, Save, X, Upload, Mail, Phone, User as UserIcon, Shield, LogOut } from 'lucide-react'
import { toast } from 'react-toastify'

export const ManagerProfile = () => {
  const { user, logout } = useAuth()
  const [isEditMode, setIsEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    avatar: ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        avatar: user.avatar || ''
      })
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          avatar: reader.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      await userApi.updateProfile({
        name: formData.name,
        phone: formData.phone,
        avatar: formData.avatar
      })
      toast.success('Profile updated successfully')
      setIsEditMode(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        avatar: user.avatar || ''
      })
    }
    setIsEditMode(false)
  }

  const getInitials = () => {
    const names = formData.name.split(' ')
    const first = names[0]?.charAt(0)?.toUpperCase() || ''
    const last = names[names.length - 1]?.charAt(0)?.toUpperCase() || ''
    return (first + last) || 'U'
  }

  if (!user) {
    return (
      <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-medium">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-500 mt-1">Manage your personal information and preferences.</p>
          </div>
          {!isEditMode && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditMode(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-100 transition-colors font-medium shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-8 border-b border-gray-100">
              <div className="relative group">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Profile"
                    className="w-28 h-28 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-gray-50"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center ring-4 ring-gray-50">
                    <span className="text-white text-3xl font-bold">{getInitials()}</span>
                  </div>
                )}
                {isEditMode && (
                  <label className="absolute bottom-1 right-1 bg-white shadow-md border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full p-2 cursor-pointer transition-colors z-10 hidden sm:flex">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Mobile avatar upload */}
                {isEditMode && (
                  <label className="sm:hidden mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="text-center sm:text-left mt-4 sm:mt-2">
                <h2 className="text-2xl font-bold text-gray-900 mb-1.5">
                  {formData.name || 'Your Name'}
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold capitalize border border-blue-100">
                  <Shield className="w-3.5 h-3.5" />
                  {user.role}
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!isEditMode}
                  className={`w-full px-4 py-2.5 rounded-lg transition-all border outline-none ${
                    isEditMode
                      ? 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      : 'bg-gray-50 border-transparent text-gray-700 cursor-not-allowed'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 border-transparent text-gray-500 cursor-not-allowed focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditMode}
                  className={`w-full px-4 py-2.5 rounded-lg transition-all border outline-none ${
                    isEditMode
                      ? 'bg-white border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      : 'bg-gray-50 border-transparent text-gray-700 cursor-not-allowed'
                  }`}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Shield className="w-4 h-4 text-gray-400" />
                  Account Role
                </label>
                <input
                  type="text"
                  value={user.role}
                  // @ts-ignore
                  disabled
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 border-transparent text-gray-500 cursor-not-allowed focus:outline-none capitalize"
                />
              </div>
            </div>

            {isEditMode && (
              <div className="flex items-center justify-end gap-3 pt-8 mt-8 border-t border-gray-100">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
