import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { userApi } from '../../api/lib/userApi'
import { Edit2, Save, X, Upload } from 'lucide-react'
import { toast } from 'react-toastify'

export const AdminProfile = () => {
  const { user } = useAuth()
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
      <div className="p-8">
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          {!isEditMode && (
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">{getInitials()}</span>
                </div>
              )}
              {isEditMode && (
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {formData.name}
              </h2>
              <p className="text-gray-600 capitalize">{user.role}</p>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!isEditMode}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg outline-none transition-colors ${
                  isEditMode
                    ? 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role
              </label>
              <input
                type="text"
                value={user.role}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditMode}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg outline-none transition-colors ${
                  isEditMode
                    ? 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                }`}
              />
            </div>

            {isEditMode && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
