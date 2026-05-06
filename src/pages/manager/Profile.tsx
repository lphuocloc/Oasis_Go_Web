import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { userApi } from '../../api/lib/userApi'
import { Edit2, Save, X, Upload, Mail, Phone, User as UserIcon, Shield, LogOut, Camera } from 'lucide-react'
import { toast } from 'react-toastify'

export const ManagerProfile = () => {
  const { user, logout, checkAuth } = useAuth()
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
      await checkAuth()
      toast.success('Cập nhật hồ sơ thành công')
      setIsEditMode(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật hồ sơ')
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

  const formatDate = (dateString?: string) => {
    const date = dateString ? new Date(dateString) : new Date()
    return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`
  }

  if (!user) {
    return (
      <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-medium">Đang tải hồ sơ...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 bg-[#F8FAFC] min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="relative mb-8 rounded-2xl bg-white shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
              <div className="relative">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Profile"
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover ring-4 ring-white shadow-lg bg-white"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-2xl flex items-center justify-center ring-4 ring-white shadow-lg">
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-white text-3xl sm:text-4xl font-bold">{getInitials()}</span>
                    </div>
                  </div>
                )}
                
                {isEditMode && (
                  <label className="absolute -bottom-2 -right-2 bg-white shadow-xl border border-gray-100 text-blue-600 rounded-xl p-2.5 cursor-pointer hover:scale-110 transition-all z-10">
                    <Camera className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex-1 mb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                      {formData.name || 'Họ và tên'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider border border-blue-100">
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </span>
                      <span className="text-gray-400 text-sm font-medium">•</span>
                      <span className="text-gray-500 text-sm font-medium">{user.email}</span>
                    </div>
                  </div>

                  {!isEditMode && (
                    <div className="flex items-center gap-3 mt-2 sm:mt-0">
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-semibold shadow-lg shadow-gray-200 active:scale-95"
                      >
                        <Edit2 className="w-4 h-4" />
                        Sửa hồ sơ
                      </button>
                      <button
                        onClick={logout}
                        className="inline-flex items-center justify-center p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all border border-rose-100 active:scale-95"
                        title="Đăng xuất"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats or Summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Tổng quan</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-50">
                  <span className="text-gray-500 text-sm font-medium">Trạng thái</span>
                  <span className="text-emerald-600 text-sm font-bold flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đang hoạt động
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-50">
                  <span className="text-gray-500 text-sm font-medium">Vai trò</span>
                  <span className="text-gray-900 text-sm font-bold capitalize">{user.role}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-500 text-sm font-medium">Thành viên từ</span>
                  <span className="text-gray-900 text-sm font-bold">{formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-100">
              <h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Thông báo</h3>
              <p className="text-sm leading-relaxed opacity-90">
                Hãy cập nhật thông tin cá nhân của bạn để mọi người có thể dễ dàng liên lạc khi cần thiết.
              </p>
            </div>
          </div>

          {/* Right Column: Form Fields */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <UserIcon className="w-5 h-5 text-gray-900" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Thông tin cá nhân</h2>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Họ và tên</label>
                    <div className="relative group">
                      <UserIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={!isEditMode}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-all border outline-none font-medium ${
                          isEditMode
                            ? 'bg-white border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500'
                            : 'bg-gray-50 border-transparent text-gray-600 cursor-not-allowed'
                        }`}
                        placeholder="Nhập họ và tên của bạn"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Địa chỉ Email</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border-transparent text-gray-500 cursor-not-allowed font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                    <div className="relative group">
                      <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={!isEditMode}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-all border outline-none font-medium ${
                          isEditMode
                            ? 'bg-white border-gray-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500'
                            : 'bg-gray-50 border-transparent text-gray-600 cursor-not-allowed'
                        }`}
                        placeholder="Nhập số điện thoại của bạn"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Vai trò tài khoản</label>
                    <div className="relative">
                      <Shield className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={user.role}
                        disabled
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border-transparent text-gray-500 cursor-not-allowed font-medium capitalize"
                      />
                    </div>
                  </div>
                </div>

                {isEditMode && (
                  <div className="flex items-center justify-end gap-3 pt-10 mt-10 border-t border-gray-50">
                    <button
                      onClick={handleCancel}
                      className="px-6 py-3 border border-gray-200 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition-all font-bold active:scale-95"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 disabled:opacity-50 active:scale-95"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Lưu thay đổi
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
