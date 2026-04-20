import React, { useEffect, useMemo, useState } from 'react'
import { Clock, MapPin, Calendar, CalendarDays, Plus, Edit2, Trash2, RefreshCw, X } from 'lucide-react'
import { DatePicker, TimePicker } from 'antd'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import type { Dayjs } from 'dayjs'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import { useManagerScope } from '../../contexts/ManagerScopeContext'

import { staffShiftApi, type StaffShiftItem, type StaffShiftName } from '../../api/lib/staffShiftApi'
import { locationShiftApi, type LocationShiftItem } from '../../api/lib/locationShiftApi'
import { staffWorkRosterApi, type StaffWorkRosterItem } from '../../api/lib/staffWorkRosterApi'
import { staffShiftAssignmentApi, type StaffShiftAssignmentItem } from '../../api/lib/staffShiftAssignmentApi'
import { userApi, type UserListItem } from '../../api/lib/userApi'
import { initUserSocket } from '../../lib/socket'

dayjs.extend(isBetween)

type TabType = 'STAFF_SHIFTS' | 'LOCATION_SHIFTS' | 'ROSTERS' | 'ASSIGNMENTS'

// ========== SHARED HELPERS & COMPONENTS ==========

const DAYS_OF_WEEK = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

const DISPLAY_DAYS = [
  { label: 'Thứ 2', index: 1 },
  { label: 'Thứ 3', index: 2 },
  { label: 'Thứ 4', index: 3 },
  { label: 'Thứ 5', index: 4 },
  { label: 'Thứ 6', index: 5 },
  { label: 'Thứ 7', index: 6 },
  { label: 'Chủ Nhật', index: 0 },
]

const getShiftColor = (name: string) => {
  const n = (name || '').toUpperCase()
  if (n.includes('SÁNG')) return {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    hover: 'hover:bg-sky-100',
    marker: 'bg-sky-500'
  }
  if (n.includes('CHIỀU')) return {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    hover: 'hover:bg-amber-100',
    marker: 'bg-amber-500'
  }
  if (n.includes('TỐI')) return {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-100',
    marker: 'bg-purple-500'
  }
  if (n.includes('ĐÊM')) return {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-100',
    marker: 'bg-indigo-500'
  }
  return {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-100',
    marker: 'bg-gray-500'
  }
}

function SectionHeader({ title, description, onRefresh, isLoading, rightAction }: any) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        {rightAction}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
      <p>{message}</p>
    </div>
  )
}

// ========== TAB 1: STAFF SHIFTS (Templates) ==========

function StaffShiftsTab({ refreshTrigger }: { refreshTrigger?: number }) {
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [formData, setFormData] = useState<{ shift_name: StaffShiftName, start_time: string, end_time: string }>({ shift_name: 'CA SÁNG', start_time: '', end_time: '' })

  const fetchShifts = async () => {
    try {
      setIsLoading(true)
      const res = await staffShiftApi.getAll({ role: 'CLEANER' })
      setShifts(res.data)
    } catch {
      toast.error('Không thể tải dữ liệu ca làm việc')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchShifts()
  }, [refreshTrigger])

  const handleOpen = (shift?: StaffShiftItem) => {
    if (shift) {
      setEditId(shift.id)
      setFormData({ shift_name: shift.shift_name, start_time: shift.start_time, end_time: shift.end_time })
    } else {
      setEditId(null)
      setFormData({ shift_name: 'CA SÁNG', start_time: '', end_time: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      setIsSaving(true)
      const times: Record<string, { start: string, end: string }> = {
        'CA SÁNG': { start: '06:00', end: '12:00' },
        'CA CHIỀU': { start: '12:00', end: '18:00' },
        'CA TỐI': { start: '18:00', end: '00:00' },
        'CA ĐÊM': { start: '00:00', end: '06:00' }
      }
      const finalData = { ...formData, ...times[formData.shift_name], role: 'CLEANER' }
      if (editId) {
        await staffShiftApi.update(editId, finalData)
        toast.success('Đã cập nhật ca')
      } else {
        await staffShiftApi.create(finalData)
        toast.success('Đã tạo ca thành công')
      }
      setIsModalOpen(false)
      fetchShifts()
    } catch {
      toast.error('Lưu ca làm việc thất bại')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá ca làm việc này?')) return
    try {
      await staffShiftApi.delete(id)
      toast.success('Đã xoá ca làm việc')
      fetchShifts()
    } catch {
      toast.error('Xoá ca làm việc thất bại')
    }
  }

  return (
    <div>
      <SectionHeader 
        title="Mẫu Ca Làm Việc" 
        description="Định nghĩa các khung giờ làm việc cố định (Sáng, Chiều, Tối...)."
        onRefresh={fetchShifts}
        isLoading={isLoading}
        rightAction={
          <button onClick={() => handleOpen()} className="inline-flex items-center gap-2 px-5 py-2.5 text-base font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Tạo Ca Mới
          </button>
        }
      />

      {shifts.length === 0 && !isLoading ? <EmptyState message="Chưa có thiết lập ca nào" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {shifts.map(shift => {
            const colors = getShiftColor(shift.shift_name)
            return (
              <div key={shift.id} className={`${colors.bg} ${colors.border} border rounded-xl p-5 shadow-sm hover:shadow-md transition group`}>
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-1 ${colors.bg} ${colors.text} text-xs rounded-full font-bold border ${colors.border}`}>{shift.shift_name}</span>
                </div>
                <div className={`flex items-center gap-2 ${colors.text} text-sm mb-4 font-medium`}>
                  <Clock className="w-4 h-4" />
                  <span>{shift.start_time} - {shift.end_time}</span>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100/50">
                  <button onClick={() => handleDelete(shift.id)} className="text-gray-400 hover:text-red-600 transition p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleOpen(shift)} className="text-gray-400 hover:text-blue-600 transition p-1">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Sửa Ca Làm Việc" : "Tạo Ca Làm Việc"} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên Ca</label>
            <select value={formData.shift_name} onChange={e => setFormData({ ...formData, shift_name: e.target.value as StaffShiftName, start_time: '', end_time: '' })} className="w-full px-4 py-2.5 text-base border rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="CA SÁNG">Ca Sáng (06:00 - 12:00)</option>
              <option value="CA CHIỀU">Ca Chiều (12:00 - 18:00)</option>
              <option value="CA TỐI">Ca Tối (18:00 - 00:00)</option>
              <option value="CA ĐÊM">Ca Đêm (00:00 - 06:00)</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-base border rounded-lg text-gray-600 hover:bg-gray-50">Hủy</button>
            <button disabled={isSaving} onClick={handleSubmit} className="px-5 py-2.5 text-base font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Lưu</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ========== TAB 2: LOCATION SHIFTS (Mapping) ==========

function LocationShiftsTab({ refreshTrigger }: { refreshTrigger?: number }) {
  const { locationOptions } = useManagerScope()
  const [items, setItems] = useState<LocationShiftItem[]>([])
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [formData, setFormData] = useState({ location_id: '', shift_id: '' })

  const fetchAll = async () => {
    try {
      setIsLoading(true)
      const [resLoc, resShift] = await Promise.all([
        locationShiftApi.getAll(),
        staffShiftApi.getAll({ role: 'CLEANER' })
      ])
      const parentIds = locationOptions.map(opt => opt.id)
      const myLocationShifts = resLoc.data ? resLoc.data.filter((ls: LocationShiftItem) => parentIds.includes(ls.location_id)) : []
      setItems(myLocationShifts)
      setShifts(resShift.data)
    } catch {
      toast.error('Không thể tải dữ liệu gán ca')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (locationOptions.length > 0) fetchAll()
  }, [locationOptions, refreshTrigger])

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn gỡ ca làm việc này khỏi khu vực?')) return
    try {
      await locationShiftApi.delete(id)
      toast.success('Đã gỡ ca làm việc')
      fetchAll()
    } catch {
      toast.error('Gỡ ca làm việc thất bại')
    }
  }

  const handleSubmit = async () => {
    if (!formData.location_id || !formData.shift_id) return toast.error('Vui lòng điền đủ thông tin')
    try {
      await locationShiftApi.create(formData)
      toast.success('Đã gán ca cho khu vực thành công')
      setIsModalOpen(false)
      fetchAll()
    } catch {
      toast.error('Gán ca thất bại')
    }
  }

  return (
    <div>
      <SectionHeader 
        title="Gán Ca Cho Khu Vực" 
        description="Áp dụng các mẫu ca đã tạo cho từng khu vực cụ thể."
        onRefresh={fetchAll}
        isLoading={isLoading}
        rightAction={
          <button onClick={() => { setFormData({ location_id: locationOptions[0]?.id || '', shift_id: shifts[0]?.id || '' }); setIsModalOpen(true); }} className="inline-flex items-center gap-2 px-5 py-2.5 text-base font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
            <Plus className="w-4 h-4" /> Gán Khu Vực Mới
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-5 font-bold text-gray-700">Khu Vực</th>
              <th className="px-6 py-5 font-bold text-gray-700">Tên Ca</th>
              <th className="px-6 py-5 font-bold text-gray-700">Khung Giờ</th>
              <th className="px-6 py-5 text-right font-bold text-gray-700">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => {
              const location = locationOptions.find(l => l.id === item.location_id)
              const shift = shifts.find(s => s.id === item.shift_id)
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-5 font-semibold text-gray-900">{location?.name || 'Khu vực không xác định'}</td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getShiftColor(shift?.shift_name || '').bg} ${getShiftColor(shift?.shift_name || '').text}`}>
                      {shift?.shift_name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-gray-600 font-medium">{shift ? `${shift.start_time} - ${shift.end_time}` : '-'}</td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-600 p-1 transition shadow-none border-none bg-transparent">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && !isLoading && <tr><td colSpan={4} className="p-12 text-center text-gray-400">Chưa có liên kết ca - khu vực nào</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Gán Ca Làm Việc Cho Khu Vực" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Khu Vực</label>
            <select value={formData.location_id} onChange={e => setFormData({ ...formData, location_id: e.target.value })} className="w-full px-4 py-2.5 text-base border rounded-lg outline-none focus:ring-2 focus:ring-purple-500">
              <option value="" disabled>Chọn Khu Vực</option>
              {locationOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mẫu Ca</label>
            <select value={formData.shift_id} onChange={e => setFormData({ ...formData, shift_id: e.target.value })} className="w-full px-4 py-2.5 text-base border rounded-lg outline-none focus:ring-2 focus:ring-purple-500">
              <option value="" disabled>Chọn Ca</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name} ({s.start_time}-{s.end_time})</option>)}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-base border rounded-lg text-gray-600">Hủy</button>
            <button onClick={handleSubmit} className="px-5 py-2.5 text-base font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700">Xác Nhận</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ========== TAB 3: ROSTERS (Weekly Matrix) ==========

function RostersTab({ refreshTrigger }: { refreshTrigger?: number }) {
  const { locationOptions } = useManagerScope()
  const [rosters, setRosters] = useState<StaffWorkRosterItem[]>([])
  const [cleaners, setCleaners] = useState<UserListItem[]>([])
  const [locShifts, setLocShifts] = useState<LocationShiftItem[]>([])
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [formData, setFormData] = useState<{ staff_id: string, location_id: string, location_shift_id: string, days_of_week: number[] }>({
    staff_id: '', location_id: '', location_shift_id: '', days_of_week: []
  })

  const [genData, setGenData] = useState({ staff_id: '', start_date: dayjs().startOf('month').format('YYYY-MM-DD'), end_date: dayjs().endOf('month').format('YYYY-MM-DD') })

  const fetchAll = async () => {
    try {
      setIsLoading(true)
      const [uRes, lsRes, sRes] = await Promise.all([
        userApi.getActiveUsers('cleaner'),
        locationShiftApi.getAll(),
        staffShiftApi.getAll({ role: 'CLEANER' })
      ])
      setCleaners(uRes.data)
      setShifts(sRes.data)
      const parentIds = locationOptions.map(opt => opt.id)
      const myLocShifts = lsRes.data ? lsRes.data.filter((ls: LocationShiftItem) => parentIds.includes(ls.location_id)) : []
      setLocShifts(myLocShifts)

      const rRes = await staffWorkRosterApi.getAll()
      const myLocShiftIds = myLocShifts.map((x: LocationShiftItem) => x.id)
      setRosters(rRes.data.filter((r: StaffWorkRosterItem) => myLocShiftIds.includes(r.location_shift_id)))
    } catch {
      toast.error('Không thể tải dữ liệu lịch trực')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (locationOptions.length > 0) fetchAll()
  }, [locationOptions, refreshTrigger])

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá lịch trực này?')) return
    await staffWorkRosterApi.delete(id)
    toast.success('Đã xoá')
    fetchAll()
  }

  const handleSubmit = async () => {
    if (!formData.staff_id || !formData.location_shift_id || formData.days_of_week.length === 0) return toast.error('Vui lòng điền đủ thông tin')
    try {
      await staffWorkRosterApi.create(formData)
      toast.success('Đã tạo lịch trực')
      setIsModalOpen(false)
      fetchAll()
    } catch {
      toast.error('Tạo lịch trực thất bại')
    }
  }

  const handleGenerate = async () => {
    if (!genData.start_date || !genData.end_date) return toast.error('Vui lòng chọn thời gian')
    try {
      setIsGenerating(true)
      const res = await staffShiftAssignmentApi.generate(genData)
      toast.success(res.message || `Đã tạo ${res.created} ca làm việc`)
      setIsGenerateModalOpen(false)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Tạo ca làm việc thất bại')
    } finally {
      setIsGenerating(false)
    }
  }

  const groupedRosters = useMemo(() => {
    const map = new Map<string, {
      staff_id: string;
      location_id: string;
      staffName: string;
      locationName: string;
      assignments: Record<number, { id: string, shiftName: string, startTime: string, endTime: string }[]>
    }>()

    rosters.forEach(r => {
      const cleaner = cleaners.find(c => c.id === r.staff_id || c._id === r.staff_id)
      const locShift = locShifts.find(ls => ls.id === r.location_shift_id)
      if (!locShift) return
      const location = locationOptions.find(opt => opt.id === locShift.location_id)
      const shift = shifts.find(s => s.id === locShift.shift_id)

      if (!location) return

      const key = `${r.staff_id}-${location.id}`
      if (!map.has(key)) {
        map.set(key, {
          staff_id: r.staff_id,
          location_id: location.id,
          staffName: cleaner?.name || 'Không xác định',
          locationName: location.name,
          assignments: {}
        })
      }

      const entry = map.get(key)!
      if (!entry.assignments[r.day_of_week]) entry.assignments[r.day_of_week] = []
      entry.assignments[r.day_of_week].push({
        id: r.id,
        shiftName: shift?.shift_name || 'N/A',
        startTime: shift?.start_time || '',
        endTime: shift?.end_time || ''
      })
    })

    return Array.from(map.values()).sort((a, b) => a.staffName.localeCompare(b.staffName))
  }, [rosters, cleaners, locShifts, locationOptions, shifts])

  return (
    <div>
      <SectionHeader 
        title="Lịch Làm Việc Cố Định" 
        description="Thiết lập khung làm việc lặp lại hàng tuần cho nhân viên."
        onRefresh={fetchAll}
        isLoading={isLoading}
        rightAction={
          <div className="flex gap-2">
            <button onClick={() => setIsGenerateModalOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 text-base font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
              <Calendar className="w-4 h-4" /> Xuất Bản Lịch
            </button>
            <button onClick={() => { setFormData({ staff_id: cleaners[0]?.id || cleaners[0]?._id || '', location_id: '', location_shift_id: '', days_of_week: [] }); setIsModalOpen(true); }} className="inline-flex items-center gap-2 px-5 py-2.5 text-base font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              <Plus className="w-4 h-4" /> Thêm Lịch Mới
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="sticky left-0 bg-gray-50 z-10 px-4 py-5 font-bold text-gray-700 border-r w-44 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Nhân Viên</th>
              <th className="sticky left-44 bg-gray-50 z-10 px-4 py-5 font-bold text-gray-700 border-r w-44 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Khu Vực</th>
              {DISPLAY_DAYS.map(day => (
                <th key={day.index} className="px-3 py-5 font-bold text-gray-600 text-center border-r last:border-r-0">{day.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groupedRosters.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 group">
                <td className="sticky left-0 bg-white group-hover:bg-gray-50 z-10 px-4 py-4 font-semibold text-gray-900 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  {item.staffName}
                </td>
                <td className="sticky left-44 bg-white group-hover:bg-gray-50 z-10 px-4 py-4 text-gray-600 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  {item.locationName}
                </td>
                {DISPLAY_DAYS.map(day => {
                  const dayAssignments = item.assignments[day.index] || []
                  return (
                    <td key={day.index} className="px-2 py-3 border-r last:border-r-0 align-top min-w-[100px]">
                      <div className="flex flex-col gap-1.5">
                        {dayAssignments.map(a => {
                          const colors = getShiftColor(a.shiftName)
                          return (
                            <div key={a.id} className={`group/item relative flex flex-col p-1.5 rounded border transition-all ${colors.bg} ${colors.text} ${colors.border} ${colors.hover}`}>
                              <button onClick={() => handleDelete(a.id)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-rose-200 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 hover:bg-rose-500 hover:text-white transition-opacity shadow-sm z-10">
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                              <div className="font-bold text-[9px] uppercase truncate">{a.shiftName}</div>
                              <div className="text-[8px] opacity-80">{a.startTime}-{a.endTime}</div>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
            {groupedRosters.length === 0 && !isLoading && (
              <tr>
                <td colSpan={9} className="p-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarDays className="w-8 h-8 text-gray-200" />
                    <p>Chưa có lịch trực cố định nào</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm Lịch Làm Việc Cố Định" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhân Viên</label>
            <select value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} className="w-full px-4 py-2.5 text-base border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="" disabled>Chọn nhân viên</option>
              {cleaners.map((c) => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Khu Vực</label>
              <select value={formData.location_id} onChange={e => setFormData({ ...formData, location_id: e.target.value, location_shift_id: '' })} className="w-full px-4 py-2.5 text-base border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="" disabled>Chọn khu vực</option>
                {locationOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ca Làm Việc</label>
              <select disabled={!formData.location_id} value={formData.location_shift_id} onChange={e => setFormData({ ...formData, location_shift_id: e.target.value })} className="w-full px-4 py-2.5 text-base border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100">
                <option value="" disabled>Chọn ca</option>
                {locShifts.filter(ls => ls.location_id === formData.location_id).map((ls) => {
                  const s = shifts.find(x => x.id === ls.shift_id)
                  return <option key={ls.id} value={ls.id}>{s?.shift_name} ({s?.start_time})</option>
                })}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Các Ngày Trong Tuần</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const days = formData.days_of_week.includes(idx) ? formData.days_of_week.filter(d => d !== idx) : [...formData.days_of_week, idx]
                    setFormData({ ...formData, days_of_week: days })
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    formData.days_of_week.includes(idx) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-base border rounded-lg text-gray-600">Hủy</button>
            <button onClick={handleSubmit} className="px-5 py-2.5 text-base font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Lưu Lịch</button>
          </div>
        </div>
      </Modal>

      {/* Generate Modal */}
      <Modal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} title="Xuất Bản Lịch Làm Việc" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 italic">Dựa trên khung cố định để tạo phân công chi tiết cho khoảng thời gian.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Từ Ngày</label>
              <DatePicker className="w-full" size="large" value={dayjs(genData.start_date)} onChange={(v) => setGenData({...genData, start_date: v?.format('YYYY-MM-DD') || ''})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đến Ngày</label>
              <DatePicker className="w-full" size="large" value={dayjs(genData.end_date)} onChange={(v) => setGenData({...genData, end_date: v?.format('YYYY-MM-DD') || ''})} />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button onClick={() => setIsGenerateModalOpen(false)} className="px-5 py-2.5 text-base border rounded-lg text-gray-600">Hủy</button>
            <button disabled={isGenerating} onClick={handleGenerate} className="px-5 py-2.5 text-base font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {isGenerating ? 'Đang tạo...' : 'Xác Nhận'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ========== TAB 4: ASSIGNMENTS (Timeline with bars) ==========

function AssignmentsTab({ refreshTrigger }: { refreshTrigger?: number }) {
  const { locationOptions } = useManagerScope()
  const [assignments, setAssignments] = useState<StaffShiftAssignmentItem[]>([])
  const [cleaners, setCleaners] = useState<UserListItem[]>([])
  const [locShifts, setLocShifts] = useState<LocationShiftItem[]>([])
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const [targetMonth, setTargetMonth] = useState(dayjs())
  
  // Modal for individual day detail
  const [selectedDayInfo, setSelectedDayInfo] = useState<{ cleaner: UserListItem, date: string, items: any[] } | null>(null)

  const fetchAll = async () => {
    try {
      setIsLoading(true)
      const [uRes, lsRes, sRes, aRes] = await Promise.all([
        userApi.getActiveUsers('cleaner'),
        locationShiftApi.getAll(),
        staffShiftApi.getAll({ role: 'CLEANER' }),
        staffShiftAssignmentApi.getAll({
           start_date: targetMonth.startOf('month').format('YYYY-MM-DD'),
           end_date: targetMonth.endOf('month').format('YYYY-MM-DD')
        })
      ])
      setCleaners(uRes.data)
      setShifts(sRes.data)
      const parentIds = locationOptions.map(opt => opt.id)
      const myLocShifts = lsRes.data ? lsRes.data.filter((ls: LocationShiftItem) => parentIds.includes(ls.location_id)) : []
      setLocShifts(myLocShifts)

      const myLocShiftIds = new Set(myLocShifts.map((x: LocationShiftItem) => x.id))
      setAssignments(aRes.data.filter((a: StaffShiftAssignmentItem) => myLocShiftIds.has(a.location_shift_id)))
    } catch {
      toast.error('Không thể tải dữ liệu phân công')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [targetMonth, refreshTrigger])

  const daysInMonth = useMemo(() => {
    const days = []
    const start = targetMonth.startOf('month')
    for (let i = 0; i < targetMonth.daysInMonth(); i++) {
      days.push(start.add(i, 'day'))
    }
    return days
  }, [targetMonth])

  const handleDelete = async (id: string) => {
    if (!confirm('Xoá phân công này?')) return
    await staffShiftAssignmentApi.delete(id)
    toast.success('Đã xoá')
    setSelectedDayInfo(null)
    fetchAll()
  }

  return (
    <div>
      <SectionHeader 
        title="Tiến Độ Phân Công" 
        description="Theo dõi và quản lý các ca trực chi tiết hàng ngày."
        onRefresh={fetchAll}
        isLoading={isLoading}
        rightAction={
          <div className="flex items-center gap-3 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
             <button onClick={() => setTargetMonth(prev => prev.subtract(1, 'month'))} className="p-1 hover:bg-gray-100 rounded transition">{'<'}</button>
             <span className="text-sm font-bold text-gray-700 min-w-[120px] text-center">Tháng {targetMonth.format('MM/YYYY')}</span>
             <button onClick={() => setTargetMonth(prev => prev.add(1, 'month'))} className="p-1 hover:bg-gray-100 rounded transition">{'>'}</button>
          </div>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[1400px] table-fixed">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 bg-gray-50 z-30 px-4 py-5 font-bold text-gray-700 border-r w-48 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Nhân Viên</th>
              {daysInMonth.map(day => (
                <th key={day.toString()} className={`px-1 py-4 text-center border-r font-medium ${day.day() === 0 ? 'bg-red-50 text-red-600' : 'text-gray-500'}`}>
                  <div className="text-[10px] uppercase">{day.format('ddd')}</div>
                  <div className="text-sm font-bold">{day.date()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cleaners.map(cleaner => (
              <tr key={cleaner.id} className="hover:bg-gray-50/50 group h-14">
                <td className="sticky left-0 bg-white group-hover:bg-gray-50 z-10 px-4 py-0 font-bold text-gray-900 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)] truncate">
                  {cleaner.name}
                </td>
                {daysInMonth.map(day => {
                  const dateStr = day.format('YYYY-MM-DD')
                  const dayItems = assignments.filter(a => {
                    const isSame = (a.staff_id === cleaner.id || a.staff_id === cleaner._id)
                    const isWithin = dayjs(dateStr).isBetween(dayjs(a.start_date), dayjs(a.end_date || a.start_date), 'day', '[]')
                    return isSame && isWithin
                  })

                  return (
                    <td 
                      key={dateStr} 
                      className={`relative p-0 border-r cursor-pointer hover:bg-blue-50/30 transition-colors ${day.day() === 0 ? 'bg-red-50/20' : ''}`}
                      onClick={() => dayItems.length > 0 && setSelectedDayInfo({
                        cleaner,
                        date: dateStr,
                        items: dayItems.map(a => {
                          const ls = locShifts.find(x => x.id === a.location_shift_id)
                          const loc = locationOptions.find(l => l.id === ls?.location_id)
                          const s = shifts.find(x => x.id === ls?.shift_id)
                          return { ...a, locationName: loc?.name || '?', shiftName: s?.shift_name || '?', startTime: s?.start_time, endTime: s?.end_time }
                        })
                      })}
                    >
                      <div className="flex flex-col h-full justify-center px-0.5 gap-0.5">
                        {dayItems.map(a => {
                          const ls = locShifts.find(x => x.id === a.location_shift_id)
                          const s = shifts.find(x => x.id === ls?.shift_id)
                          const colors = getShiftColor(s?.shift_name || '')
                          
                          const isStart = dayjs(dateStr).isSame(dayjs(a.start_date), 'day')
                          const isEnd = dayjs(dateStr).isSame(dayjs(a.end_date || a.start_date), 'day')
                          
                          return (
                            <div 
                              key={a.id} 
                              className={`h-6 flex items-center px-1 transition-all ${colors.bg} ${colors.text} border-y ${colors.border}
                                ${isStart ? 'rounded-l ml-1 border-l' : 'border-l-0'} 
                                ${isEnd ? 'rounded-r mr-1 border-r' : 'border-r-0'}
                              `}
                              title={`${s?.shift_name} | ${dayjs(a.start_date).format('DD/MM')} - ${dayjs(a.end_date).format('DD/MM')}`}
                            >
                               {isStart && <span className="text-[9px] font-bold truncate leading-none">{s?.shift_name}</span>}
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Day Detail Modal */}
      <Modal isOpen={!!selectedDayInfo} onClose={() => setSelectedDayInfo(null)} title={`Chi tiết ngày ${dayjs(selectedDayInfo?.date).format('DD/MM/YYYY')}`} size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
             <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
               {selectedDayInfo?.cleaner.name[0]}
             </div>
             <div>
               <div className="font-bold text-gray-900">{selectedDayInfo?.cleaner.name}</div>
               <div className="text-sm text-gray-500">Phân công chi tiết cho ngày đã chọn</div>
             </div>
          </div>

          <div className="space-y-3">
             {selectedDayInfo?.items.map(item => {
               const colors = getShiftColor(item.shiftName)
               return (
                 <div key={item.id} className={`p-4 rounded-xl border-2 ${colors.border} ${colors.bg} flex justify-between items-center group`}>
                    <div className="flex gap-4">
                      <div className={`w-1 font-bold ${colors.marker} rounded-full`} />
                      <div>
                        <div className={`font-extrabold ${colors.text} uppercase text-sm`}>{item.shiftName}</div>
                        <div className="text-gray-600 font-medium flex items-center gap-1.5 mt-1">
                           <MapPin className="w-3.5 h-3.5 opacity-60" /> {item.locationName}
                        </div>
                        <div className="text-gray-500 text-xs flex items-center gap-1.5 mt-1">
                           <Clock className="w-3.5 h-3.5 opacity-60" /> {item.startTime} - {item.endTime}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-2 italic">
                          Thời đoạn: {dayjs(item.start_date).format('DD/MM')} đến {dayjs(item.end_date).format('DD/MM')}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                       <Trash2 className="w-5 h-5" />
                    </button>
                 </div>
               )
             })}
          </div>

          <div className="pt-4 flex justify-end">
            <button onClick={() => setSelectedDayInfo(null)} className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all">Đóng</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ========== MAIN COMPONENT ==========

export const ShiftManagement = () => {
  const [activeTab, setActiveTab] = useState<TabType>('STAFF_SHIFTS')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const socket = initUserSocket()
    if (!socket) return

    const handleNewData = () => {
      setRefreshTrigger(prev => prev + 1)
    }

    socket.on('user:notification', handleNewData)
    socket.on('dashboard:refresh', handleNewData)

    return () => {
      socket.off('user:notification', handleNewData)
      socket.off('dashboard:refresh', handleNewData)
    }
  }, [])

  const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'STAFF_SHIFTS', label: 'Mẫu Ca Làm', icon: <Clock className="w-4 h-4" /> },
    { id: 'LOCATION_SHIFTS', label: 'Gán Khu Vực', icon: <MapPin className="w-4 h-4" /> },
    { id: 'ROSTERS', label: 'Lịch Làm Cố Định', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'ASSIGNMENTS', label: 'Phân Công Chi Tiết (Timeline)', icon: <Calendar className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Banner */}
      <div className="bg-white border-b border-gray-200 px-8 py-8 pt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Quản Lý Ca Trực</h1>
            <p className="text-gray-500 mt-2 max-w-2xl text-base font-medium">
              Thiết lập khung giờ, phân bổ khu vực và theo dõi tiến độ nhân sự hàng ngày.
            </p>
          </div>
          <div className="hidden md:flex gap-6">
             <div className="text-right">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Hôm nay</div>
                <div className="text-lg font-black text-gray-900">{dayjs().format('DD/MM/YYYY')}</div>
             </div>
          </div>
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-6 py-3 flex items-center gap-3 font-bold text-sm transition-all rounded-t-xl group ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-y-[-2px]'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`${activeTab === tab.id ? 'text-white' : 'text-gray-300 group-hover:text-gray-400'} transition-colors`}>
                {tab.icon}
              </div>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 flex-1 max-w-[1600px] mx-auto w-full">
        <div className="bg-white p-1 rounded-2xl shadow-sm ring-1 ring-gray-200/50">
          <div className="bg-gray-50/30 rounded-xl p-8">
            {activeTab === 'STAFF_SHIFTS' && <StaffShiftsTab refreshTrigger={refreshTrigger} />}
            {activeTab === 'LOCATION_SHIFTS' && <LocationShiftsTab refreshTrigger={refreshTrigger} />}
            {activeTab === 'ROSTERS' && <RostersTab refreshTrigger={refreshTrigger} />}
            {activeTab === 'ASSIGNMENTS' && <AssignmentsTab refreshTrigger={refreshTrigger} />}
          </div>
        </div>
      </div>
    </div>
  )
}
