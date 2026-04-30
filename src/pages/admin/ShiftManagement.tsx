import React, { useEffect, useState } from 'react'
import { Clock, MapPin, CalendarDays, Plus, Trash2, RefreshCw, LogIn, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'

import { staffShiftApi, type StaffShiftItem } from '../../api/lib/staffShiftApi'
import { locationShiftApi, type LocationShiftItem } from '../../api/lib/locationShiftApi'
import { staffWorkRosterApi, type StaffWorkRosterItem } from '../../api/lib/staffWorkRosterApi'
import { staffAttendanceLogApi, type StaffAttendanceLogItem } from '../../api/lib/staffAttendanceLogApi'
import { userApi, type UserListItem } from '../../api/lib/userApi'
import { locationApi, type LocationItem } from '../../api/lib/locationApi'
import { initUserSocket } from '../../lib/socket'

type TabType = 'STAFF_SHIFTS' | 'LOCATION_SHIFTS' | 'ROSTERS' | 'ATTENDANCE'

const getShiftColor = (name: string) => {
  const n = name.toUpperCase()
  if (n.includes('SÁNG') || n.includes('MORNING')) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
  if (n.includes('CHIỀU') || n.includes('AFTERNOON')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
  if (n.includes('TỐI') || n.includes('NIGHT')) return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
  return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
}

const SectionHeader = ({ title, description, onRefresh, isLoading, rightAction }: any) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
    <div>
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        {title} {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />}
      </h2>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
    <div className="flex items-center gap-3">
      <button onClick={onRefresh} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
        <RefreshCw className="w-5 h-5" />
      </button>
      {rightAction}
    </div>
  </div>
)

// ========== TAB 1: STAFF SHIFTS (CRUD) ==========
const FIXED_SHIFTS = {
  'CA SÁNG':  { start_time: '06:00', end_time: '12:00' },
  'CA CHIỀU': { start_time: '12:00', end_time: '18:00' },
  'CA TỐI':   { start_time: '18:00', end_time: '00:00' },
  'CA ĐÊM':   { start_time: '00:00', end_time: '06:00' },
} as const

const StaffShiftsTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedName, setSelectedName] = useState<keyof typeof FIXED_SHIFTS>('CA SÁNG')

  const fetchShifts = async () => {
    try { setIsLoading(true); const r = await staffShiftApi.getAll(); setShifts(r.data || []) }
    catch { toast.error('Lỗi tải ca') } finally { setIsLoading(false) }
  }
  useEffect(() => { fetchShifts() }, [refreshTrigger])

  const existingNames = shifts.map(s => s.shift_name)
  const availableToCreate = (Object.keys(FIXED_SHIFTS) as (keyof typeof FIXED_SHIFTS)[]).filter(n => !existingNames.includes(n as any))

  const handleCreate = async () => {
    const times = FIXED_SHIFTS[selectedName]
    try {
      await staffShiftApi.create({ shift_name: selectedName as any, ...times })
      toast.success('Đã tạo ca'); setIsModalOpen(false); fetchShifts()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Lỗi') }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Xóa ca này?')) return
    try { await staffShiftApi.delete(id); toast.success('Đã xóa'); fetchShifts() } catch { toast.error('Lỗi') }
  }

  return (
    <div>
      <SectionHeader title="Mẫu Ca Làm Việc" description="4 ca cố định (6 tiếng/ca). Tạo sẵn các ca để gán cho Location." onRefresh={fetchShifts} isLoading={isLoading}
        rightAction={
          availableToCreate.length > 0
            ? <button onClick={() => { setSelectedName(availableToCreate[0]); setIsModalOpen(true) }} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"><Plus className="w-4 h-4" /> Tạo Ca</button>
            : <span className="text-xs text-gray-400 italic">Đã đủ 4 ca</span>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(FIXED_SHIFTS) as [keyof typeof FIXED_SHIFTS, {start_time:string,end_time:string}][]).map(([name, times]) => {
          const existing = shifts.find(s => s.shift_name === name)
          const c = getShiftColor(name)
          return (
            <div key={name} className={`p-5 rounded-xl border ${existing ? c.border+' '+c.bg : 'border-dashed border-gray-200 bg-white opacity-60'}`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wider ${existing ? c.text : 'text-gray-400'}`}>{existing ? 'Đã tạo' : 'Chưa tạo'}</span>
                {existing && <button onClick={() => handleDelete(existing.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
              <h3 className={`text-base font-bold ${existing ? c.text : 'text-gray-400'}`}>{name}</h3>
              <div className="text-xl font-mono font-bold text-gray-700 mt-1">{times.start_time} – {times.end_time}</div>
            </div>
          )
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tạo Ca Làm Việc</h2>
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-gray-700">Chọn ca</label>
              <select value={selectedName} onChange={e => setSelectedName(e.target.value as any)} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {availableToCreate.map(n => <option key={n} value={n}>{n} ({FIXED_SHIFTS[n].start_time}–{FIXED_SHIFTS[n].end_time})</option>)}
              </select>
              <p className="text-xs text-gray-400">Khung giờ được tạo sẵn cố định, không thể chỉnh.</p>
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
              <button onClick={handleCreate} className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Tạo Ca</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ========== TAB 2: LOCATION SHIFTS (Assign shifts to parent locations) ==========
const LocationShiftsTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const [locShifts, setLocShifts] = useState<LocationShiftItem[]>([])
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bulkLocIds, setBulkLocIds] = useState<string[]>([])
  const [bulkShiftIds, setBulkShiftIds] = useState<string[]>([])

  const fetchAll = async () => {
    try {
      setIsLoading(true)
      const [lsR, locR, sR] = await Promise.all([
        locationShiftApi.getAll(),
        locationApi.getAll({ isActive: 'true' }),
        staffShiftApi.getAll()
      ])
      setLocShifts(lsR.data || [])
      setLocations(locR.data || [])
      setShifts(sR.data || [])
    } catch { toast.error('Lỗi tải dữ liệu') } finally { setIsLoading(false) }
  }
  useEffect(() => { fetchAll() }, [refreshTrigger])

  const parentLocations = locations.filter(l => !l.parent_id)

  // Group locShifts by location_id (only parent locations)
  const grouped = parentLocations.map(loc => {
    const assigned = locShifts.filter(ls => ls.location_id === loc.id)
    const assignedShifts = assigned.map(ls => ({
      lsId: ls.id,
      shift: shifts.find(s => s.id === ls.shift_id)
    })).filter(x => x.shift)
    return { loc, assignedShifts }
  }).filter(g => g.assignedShifts.length > 0)

  const handleBulkCreate = async () => {
    if (bulkLocIds.length === 0 || bulkShiftIds.length === 0) return toast.error('Vui lòng chọn ít nhất 1 location và 1 ca')
    try {
      setIsLoading(true)
      // Create a list of assignments to create, avoiding duplicates if already exists
      const tasks: any[] = []
      bulkLocIds.forEach(lId => {
        bulkShiftIds.forEach(sId => {
          // Check if this pair already exists
          const exists = locShifts.some(ls => ls.location_id === lId && ls.shift_id === sId)
          if (!exists) {
            tasks.push(locationShiftApi.create({ location_id: lId, shift_id: sId }))
          }
        })
      })

      if (tasks.length === 0) {
        toast.info('Tất cả các ca chọn đã được gán trước đó.')
        setIsModalOpen(false)
        return
      }

      await Promise.all(tasks)
      toast.success(`Đã gán thành công ${tasks.length} ca trực`)
      setIsModalOpen(false)
      fetchAll()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Có lỗi khi gán ca')
    } finally {
      fetchAll()
    }
  }

  const toggleLoc = (id: string) => setBulkLocIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleShift = (id: string) => setBulkShiftIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const handleDelete = async (id: string) => {
    if (!confirm('Gỡ gán ca này?')) return
    try { await locationShiftApi.delete(id); toast.success('Đã gỡ'); fetchAll() } catch { toast.error('Lỗi') }
  }



  return (
    <div>
      <SectionHeader
        title="Gán Ca → Location Cha"
        description="Mỗi Location cha có thể gán nhiều ca. Location con kế thừa."
        onRefresh={fetchAll}
        isLoading={isLoading}
        rightAction={
          <button
            onClick={() => { setBulkLocIds([]); setBulkShiftIds([]); setIsModalOpen(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Gán Ca
          </button>
        }
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location Cha</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ca Đã Gán</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={3} className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-full" /></td>
                </tr>
              ))
            ) : grouped.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400">Chưa gán ca nào</td></tr>
            ) : (
              grouped.map(({ loc, assignedShifts }) => (
                <tr key={loc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{loc.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{loc.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {assignedShifts.map(({ lsId, shift }) => {
                        const c = getShiftColor(shift!.shift_name)
                        return (
                          <span key={lsId} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
                            {shift!.shift_name}
                            <button onClick={() => handleDelete(lsId)} className="ml-0.5 hover:text-red-600 transition-colors">×</button>
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => { setBulkLocIds([loc.id]); setBulkShiftIds([]); setIsModalOpen(true) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Thêm ca
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Gán Ca Làm Việc</h2>
            <p className="text-sm text-gray-500 mb-6">Chọn nhiều khu vực và nhiều ca để gán hàng loạt.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden">
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Chọn Khu Vực ({parentLocations.length})</label>
                  <button onClick={() => setBulkLocIds(bulkLocIds.length === parentLocations.length ? [] : parentLocations.map(l => l.id))} className="text-xs text-indigo-600 font-bold hover:underline">
                    {bulkLocIds.length === parentLocations.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                  {parentLocations.map(loc => (
                    <label key={loc.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${bulkLocIds.includes(loc.id) ? 'bg-white shadow-sm border-indigo-100 border' : 'hover:bg-gray-100 border border-transparent'}`}>
                      <input type="checkbox" checked={bulkLocIds.includes(loc.id)} onChange={() => toggleLoc(loc.id)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">{loc.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{loc.type}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">2. Chọn Ca Trực ({shifts.length})</label>
                <div className="space-y-3">
                  {shifts.sort((a,b) => a.start_time.localeCompare(b.start_time)).map(s => {
                    const c = getShiftColor(s.shift_name)
                    const isSelected = bulkShiftIds.includes(s.id)
                    return (
                      <label key={s.id} className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer border-2 transition-all group ${isSelected ? `${c.border} ${c.bg} shadow-md` : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleShift(s.id)} className="sr-only" />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? `bg-indigo-600 border-indigo-600` : 'border-gray-200'}`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className={`text-base font-bold ${isSelected ? c.text : 'text-gray-700'}`}>{s.shift_name}</div>
                          <div className={`text-xs font-mono font-bold ${isSelected ? c.text : 'text-gray-400'}`}>{s.start_time} - {s.end_time}</div>
                        </div>
                        <Clock className={`w-5 h-5 transition-colors ${isSelected ? c.text : 'text-gray-200 group-hover:text-gray-400'}`} />
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-6 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">Hủy</button>
              <button onClick={handleBulkCreate} disabled={bulkLocIds.length === 0 || bulkShiftIds.length === 0} className="px-10 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:shadow-none">
                Gán {bulkLocIds.length * bulkShiftIds.length > 0 ? `(${bulkLocIds.length * bulkShiftIds.length} ca)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





const RostersTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const [rosters, setRosters] = useState<StaffWorkRosterItem[]>([])
  const [managers, setManagers] = useState<UserListItem[]>([])
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [locShifts, setLocShifts] = useState<LocationShiftItem[]>([])
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ staff_id: '', location_id: '', shift_id: '' })

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [rR, mR, lR, lsR, sR] = await Promise.all([
        staffWorkRosterApi.getAll(), userApi.getActiveUsers('manager'),
        locationApi.getAll({ isActive: 'true' }), locationShiftApi.getAll(), staffShiftApi.getAll()
      ])
      setRosters(rR.data || []); setManagers(mR.data || [])
      setLocations(lR.data || []); setLocShifts(lsR.data || []); setShifts(sR.data || [])
    } catch { toast.error('Lỗi tải dữ liệu') } finally { setIsLoading(false) }
  }
  useEffect(() => { fetchData() }, [refreshTrigger])

  // Chỉ location con (có parent_id) mới được gán roster
  const childLocations = locations.filter(l => l.parent_id)

  // Khi chọn location con → tìm parent → lọc ca đã gán cho parent
  const getAvailableShifts = () => {
    if (!formData.location_id) return []
    const child = locations.find(l => l.id === formData.location_id)
    if (!child?.parent_id) return shifts
    const parentShiftIds = locShifts.filter(ls => ls.location_id === child.parent_id).map(ls => ls.shift_id)
    return shifts.filter(s => parentShiftIds.includes(s.id))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa roster?')) return
    try { await staffWorkRosterApi.delete(id); toast.success('Đã xóa'); fetchData() } catch { toast.error('Lỗi') }
  }
  const handleSubmit = async () => {
    if (!formData.staff_id || !formData.location_id || !formData.shift_id) return toast.error('Chọn đủ thông tin')
    try { await staffWorkRosterApi.create(formData); toast.success('Đã tạo roster'); setIsModalOpen(false); fetchData() }
    catch (e: any) { toast.error(e.response?.data?.message || 'Lỗi') }
  }

  return (
    <div>
      <SectionHeader title="Roster Manager" description="Gán Manager vào Location con + Ca trực (kế thừa từ Location cha)." onRefresh={fetchData} isLoading={isLoading}
        rightAction={
          <button onClick={() => { setFormData({ staff_id: '', location_id: '', shift_id: '' }); setIsModalOpen(true) }} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Thêm Roster
          </button>
        }
      />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-700">Manager</th>
              <th className="px-6 py-4 font-bold text-gray-700">Location</th>
              <th className="px-6 py-4 font-bold text-gray-700">Ca Trực</th>
              <th className="px-6 py-4 font-bold text-gray-700 text-right">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rosters.filter(r => r.location_id).map(r => {
              const m = managers.find(x => x.id === r.staff_id || x._id === r.staff_id)
              const loc = locations.find(x => x.id === r.location_id)
              const s = shifts.find(x => x.id === r.shift_id)
              const c = getShiftColor(s?.shift_name || '')
              return (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4"><div className="font-bold text-gray-900">{m?.name || r.staff_id}</div><div className="text-xs text-gray-500">{m?.email}</div></td>
                  <td className="px-6 py-4 font-medium text-gray-700">{loc?.name || 'N/A'}</td>
                  <td className="px-6 py-4">{s ? <span className={`px-3 py-1 rounded-full text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>{s.shift_name} ({s.start_time}-{s.end_time})</span> : 'N/A'}</td>
                  <td className="px-6 py-4 text-right"><button onClick={() => handleDelete(r.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tạo Roster Manager</h2>
            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Manager</label>
                <select value={formData.staff_id} onChange={e => setFormData({...formData, staff_id: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm">
                  <option value="">-- Chọn --</option>
                  {managers.map(m => <option key={m.id || m._id} value={m.id || m._id}>{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Location Con</label>
                <select value={formData.location_id} onChange={e => setFormData({...formData, location_id: e.target.value, shift_id: ''})} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm">
                  <option value="">-- Chọn --</option>
                  {childLocations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Ca Trực {formData.location_id && `(${getAvailableShifts().length} ca từ Location cha)`}</label>
                <select disabled={!formData.location_id} value={formData.shift_id} onChange={e => setFormData({...formData, shift_id: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm disabled:opacity-50">
                  <option value="">-- Chọn --</option>
                  {getAvailableShifts().map(s => <option key={s.id} value={s.id}>{s.shift_name} ({s.start_time}-{s.end_time})</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
              <button onClick={handleSubmit} className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Tạo Roster</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ========== TAB 4: ATTENDANCE (Live Logs) ==========
const AttendanceTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const [logs, setLogs] = useState<StaffAttendanceLogItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const res = await staffAttendanceLogApi.getAll({ date: selectedDate, limit: 100 })
      setLogs(res.data || [])
    } catch { toast.error('Lỗi tải nhật ký điểm danh') } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [selectedDate, refreshTrigger])

  const groupedLogs = logs.reduce((acc: any, log) => {
    const key = log.staff_id
    if (!acc[key]) acc[key] = { staff: log.staff, checkin: null, checkout: null, area: '' }
    if (log.action === 'CHECKIN') acc[key].checkin = log
    if (log.action === 'CHECKOUT') acc[key].checkout = log
    acc[key].area = log.location?.name || log.cluster?.name || 'N/A'
    return acc
  }, {})

  return (
    <div>
      <SectionHeader title="Nhật Ký Điểm Danh" description="Theo dõi trạng thái check-in/out của nhân viên trong ngày." onRefresh={fetchLogs} isLoading={isLoading}
        rightAction={
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 p-0" />
          </div>
        }
      />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-700">Nhân Viên</th>
              <th className="px-6 py-4 font-bold text-gray-700">Khu Vực / Cluster</th>
              <th className="px-6 py-4 font-bold text-gray-700 text-center">Check-in</th>
              <th className="px-6 py-4 font-bold text-gray-700 text-center">Check-out</th>
              <th className="px-6 py-4 font-bold text-gray-700 text-right">Tổng Giờ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Object.values(groupedLogs).map((entry: any, idx: number) => {
              const duration = entry.checkin && entry.checkout ? dayjs(entry.checkout.created_at).diff(dayjs(entry.checkin.created_at), 'hour', true).toFixed(1) : '-'
              return (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{entry.staff?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-400 uppercase font-bold">{entry.staff?.role}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-600">{entry.area}</td>
                  <td className="px-6 py-4 text-center">
                    {entry.checkin ? <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-lg font-bold border border-green-100 text-xs"><LogIn className="w-3 h-3" /> {dayjs(entry.checkin.created_at).format('HH:mm')}</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {entry.checkout ? <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold border border-rose-100 text-xs"><LogOut className="w-3 h-3" /> {dayjs(entry.checkout.created_at).format('HH:mm')}</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">{duration !== '-' ? `${duration}h` : '-'}</td>
                </tr>
              )
            })}
            {Object.keys(groupedLogs).length === 0 && !isLoading && <tr><td colSpan={5} className="p-12 text-center text-gray-400">Không có dữ liệu điểm danh ngày {selectedDate}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const AdminShiftManagement = () => {
  const [activeTab, setActiveTab] = useState<TabType>('STAFF_SHIFTS')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const socket = initUserSocket()
    if (!socket) return
    const handleRefresh = () => setRefreshTrigger(p => p + 1)
    socket.on('dashboard:refresh', handleRefresh)
    return () => { socket.off('dashboard:refresh', handleRefresh) }
  }, [])

  const TABS: { id: TabType; label: string; icon: any }[] = [
    { id: 'STAFF_SHIFTS', label: 'Mẫu Ca', icon: <Clock className="w-4 h-4" /> },
    { id: 'LOCATION_SHIFTS', label: 'Khu Vực', icon: <MapPin className="w-4 h-4" /> },
    { id: 'ROSTERS', label: 'Roster Manager', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'ATTENDANCE', label: 'Điểm Danh', icon: <LogIn className="w-4 h-4" /> },
  ]

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Quản Lý Phân Ca & Roster</h1>
          <p className="text-gray-500 mt-1">Thiết lập lịch trực cố định và theo dõi điểm danh thời gian thực.</p>
        </div>

        <div className="flex gap-2 p-1 bg-white border border-gray-200 rounded-xl mb-8 w-fit shadow-sm">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'STAFF_SHIFTS' && <StaffShiftsTab refreshTrigger={refreshTrigger} />}
          {activeTab === 'LOCATION_SHIFTS' && <LocationShiftsTab refreshTrigger={refreshTrigger} />}
          {activeTab === 'ROSTERS' && <RostersTab refreshTrigger={refreshTrigger} />}
          {activeTab === 'ATTENDANCE' && <AttendanceTab refreshTrigger={refreshTrigger} />}
        </div>
      </div>
    </div>
  )
}