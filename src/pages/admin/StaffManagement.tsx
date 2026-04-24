/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react'
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Phone,
  Mail,
  UserCheck,
  UserX,
  RefreshCw,
  X,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast } from 'react-toastify'
import { userApi, type UserListItem } from '../../api/lib/userApi'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'

export const StaffManagement = () => {
  const [staff, setStaff] = useState<UserListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<UserListItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form states
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'manager',
    password: '',
    isActive: true
  })

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setIsLoading(true)
        // Fetch managers and cleaners separately or together if API supports multiple roles
        // We'll fetch both and combine
        const [managersRes, cleanersRes] = await Promise.all([
          userApi.getAll({ role: 'manager' }),
          userApi.getAll({ role: 'cleaner' })
        ])

        const combined = [...(managersRes.data || []), ...(cleanersRes.data || [])]
        setStaff(combined)
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Không thể tải danh sách nhân viên')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStaff()
  }, [refreshTrigger])

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
    const matchesRole = roleFilter === 'all' || s.role === roleFilter
    return matchesSearch && matchesRole
  })

  const openAddModal = () => {
    setEditingStaff(null)
    setForm({
      name: '',
      email: '',
      phone: '',
      role: 'manager',
      password: '',
      isActive: true
    })
    setIsModalOpen(true)
  }

  const openEditModal = (s: UserListItem) => {
    setEditingStaff(s)
    setForm({
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '',
      role: s.role || 'manager',
      password: '',
      isActive: s.isActive !== false
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      if (editingStaff) {
        // Update - Only role as requested "chỉ update vai trò thôi"
        const payload = {
          role: form.role
        }
        await userApi.updateStaff(editingStaff.id || (editingStaff as any)._id, payload)
        toast.success('Cập nhật vai trò thành công!')
      } else {
        // Create - Full data
        if (!form.password) {
          toast.error('Vui lòng nhập mật khẩu cho nhân viên mới')
          setIsSaving(false)
          return
        }
        await userApi.createStaff(form)
        toast.success('Thêm nhân viên mới thành công!')
      }
      setIsModalOpen(false)
      setRefreshTrigger((prev) => prev + 1)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStatus = async (s: UserListItem) => {
    try {
      const newStatus = !s.isActive
      await userApi.updateStaff(s.id || (s as any)._id, { isActive: newStatus })
      toast.success(`${newStatus ? 'Kích hoạt' : 'Khóa'} tài khoản thành công`)
      setRefreshTrigger((prev) => prev + 1)
    } catch (error: any) {
      toast.error('Không thể thay đổi trạng thái tài khoản')
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Quản Lý Nhân Sự
          </h1>
          <p className="text-gray-500 mt-1">Quản lý đội ngũ Quản lý chi nhánh và Nhân viên vệ sinh.</p>
        </div>
        <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Thêm Nhân Viên
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="manager">Manager</option>
            <option value="cleaner">Cleaner</option>
          </select>
          <Button variant="outline" onClick={() => setRefreshTrigger((p) => p + 1)} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nhân viên</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Thông tin liên hệ</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vai trò</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-8">
                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  Không tìm thấy nhân viên nào phù hợp
                </td>
              </tr>
            ) : (
              filteredStaff.map((s) => (
                <tr key={s.id || (s as any)._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase border border-indigo-100 shadow-sm">
                        {s.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-400">ID: {s.id || (s as any)._id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {s.email}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {s.phone || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${s.role === 'manager'
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}
                    >
                      {s.role?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(s)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${s.isActive !== false
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-100'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100'
                        }`}
                    >
                      {s.isActive !== false ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                      {s.isActive !== false ? 'Đang hoạt động' : 'Đã khóa'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(s)}
                        className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleStatus(s)}
                        className={`rounded-lg ${s.isActive !== false
                          ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                      >
                        {s.isActive !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Chỉnh Sửa Nhân Viên' : 'Thêm Nhân Viên Mới'}</DialogTitle>
            <DialogDescription>
              {editingStaff ? 'Cập nhật thông tin cho tài khoản nhân viên hiện tại.' : 'Tạo tài khoản mới cho Manager hoặc Cleaner.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            {!editingStaff && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Họ và tên</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder="email@oasisgo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="09xx xxx xxx"
                    />
                  </div>
                </div>
              </>
            )}

            {editingStaff && (
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl uppercase shadow-sm">
                  {editingStaff.name?.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-indigo-900">{editingStaff.name}</div>
                  <div className="text-xs text-indigo-600/70">{editingStaff.email}</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Vai trò</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="manager">Manager</option>
                <option value="cleaner">Cleaner</option>
              </select>
            </div>

            {!editingStaff && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-10"
                    placeholder="Nhập mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                {isSaving ? 'Đang lưu...' : editingStaff ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
