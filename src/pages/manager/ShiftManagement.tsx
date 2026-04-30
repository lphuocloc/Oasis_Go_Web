import React, { useEffect, useState } from 'react'
import { Clock, MapPin, CalendarDays, Plus, Trash2, RefreshCw, LogIn, LogOut } from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import { useManagerScope } from '../../contexts/ManagerScopeContext'

import { staffShiftApi, type StaffShiftItem } from '../../api/lib/staffShiftApi'
import { locationShiftApi, type LocationShiftItem } from '../../api/lib/locationShiftApi'
import { staffWorkRosterApi, type StaffWorkRosterItem } from '../../api/lib/staffWorkRosterApi'
import { staffAttendanceLogApi, type StaffAttendanceLogItem } from '../../api/lib/staffAttendanceLogApi'
import { userApi, type UserListItem } from '../../api/lib/userApi'
import { podClusterApi, type PodClusterItem } from '../../api/lib/podClusterApi'
import { initUserSocket } from '../../lib/socket'

type TabType = 'STAFF_SHIFTS' | 'LOCATION_SHIFTS' | 'ROSTERS' | 'ATTENDANCE'

const getShiftColor = (name: string) => {
  const n = (name || '').toUpperCase()
  if (n.includes('SÁNG')) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
  if (n.includes('CHIỀU')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
  if (n.includes('TỐI')) return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
  return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
}

const SectionHeader = ({ title, description, onRefresh, isLoading, rightAction }: any) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
    <div>
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        {title} {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
      </h2>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
    <div className="flex items-center gap-3">
      <button onClick={onRefresh} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
        <RefreshCw className="w-5 h-5" />
      </button>
      {rightAction}
    </div>
  </div>
)

// ========== TAB 1: STAFF SHIFTS (Cleaner Templates) ==========
const StaffShiftsTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchShifts = async () => {
    try {
      setIsLoading(true)
      const res = await staffShiftApi.getAll()
      setShifts(res.data || [])
    } catch { toast.error('Lỗi tải mẫu ca') } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchShifts() }, [refreshTrigger])

  return (
    <div>
      <SectionHeader title="Mẫu Ca Làm Việc" description="Các khung giờ làm việc cố định áp dụng cho toàn hệ thống." onRefresh={fetchShifts} isLoading={isLoading} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {shifts.map(s => {
          const colors = getShiftColor(s.shift_name)
          return (
            <div key={s.id} className={`p-5 rounded-2xl border-2 ${colors.border} ${colors.bg} shadow-sm`}>
              <div className="flex justify-between items-start mb-3">
                <div className={`w-3 h-3 rounded-full ${colors.text === 'text-orange-700' ? 'bg-orange-400' : colors.text === 'text-blue-700' ? 'bg-blue-400' : colors.text === 'text-purple-700' ? 'bg-purple-400' : 'bg-gray-400'}`} />
                <Clock className={`w-5 h-5 ${colors.text} opacity-50`} />
              </div>
              <h3 className={`text-lg font-black ${colors.text}`}>{s.shift_name}</h3>
              <div className="text-2xl font-mono font-bold text-gray-900 mt-2">{s.start_time} - {s.end_time}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ========== TAB 2: LOCATION SHIFTS (Cleaner shifts at this location) ==========
const LocationShiftsTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const { locationId } = useManagerScope()
  const [locShifts, setLocShifts] = useState<LocationShiftItem[]>([])
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = async () => {
    if (!locationId) return
    try {
      setIsLoading(true)
      const [lsRes, sRes] = await Promise.all([
        locationShiftApi.getAll(),
        staffShiftApi.getAll()
      ])
      setLocShifts((lsRes.data || []).filter(ls => ls.location_id === locationId))
      setShifts(sRes.data || [])
    } catch { toast.error('Lỗi tải gán khu vực') } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchData() }, [locationId, refreshTrigger])

  return (
    <div>
      <SectionHeader title="Ca Trực Tại Khu Vực" description="Các ca trực được áp dụng tại Location bạn quản lý." onRefresh={fetchData} isLoading={isLoading} />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-700">Ca Làm Việc</th>
              <th className="px-6 py-4 font-bold text-gray-700">Khung Giờ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {locShifts.map(ls => {
              const shift = shifts.find(s => s.id === ls.shift_id)
              const colors = getShiftColor(shift?.shift_name || '')
              return (
                <tr key={ls.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {shift?.shift_name || ls.shift_id}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-700">{shift ? `${shift.start_time} - ${shift.end_time}` : '—'}</td>
                </tr>
              )
            })}
            {locShifts.length === 0 && !isLoading && <tr><td colSpan={2} className="p-12 text-center text-gray-400">Chưa có ca trực nào tại khu vực này</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ========== TAB 3: ROSTERS (Cleaners) ==========
const RostersTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const { locationId } = useManagerScope()
  const [rosters, setRosters] = useState<StaffWorkRosterItem[]>([])
  const [cleaners, setCleaners] = useState<UserListItem[]>([])
  const [clusters, setClusters] = useState<PodClusterItem[]>([])
  const [locShifts, setLocShifts] = useState<LocationShiftItem[]>([])
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ staff_id: '', cluster_id: '', shift_id: '' })

  const fetchData = async () => {
    if (!locationId) return
    try {
      setIsLoading(true)
      const [rRes, cRes, clRes, lsRes, sRes] = await Promise.all([
        staffWorkRosterApi.getAll(), userApi.getActiveUsers('cleaner'),
        podClusterApi.getAll(locationId), locationShiftApi.getAll(), staffShiftApi.getAll()
      ])
      const clusterIds = (clRes.data || []).map(x => x.id)
      setRosters((rRes.data || []).filter(r => clusterIds.includes(r.cluster_id || '')))
      setCleaners(cRes.data || []); setClusters(clRes.data || [])
      setLocShifts(lsRes.data || []); setShifts(sRes.data || [])
    } catch { toast.error('Lỗi tải dữ liệu') } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchData() }, [locationId, refreshTrigger])

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa roster của cleaner này?')) return
    try {
      await staffWorkRosterApi.delete(id)
      toast.success('Đã xóa roster')
      fetchData()
    } catch { toast.error('Xóa thất bại') }
  }

  const handleSubmit = async () => {
    if (!formData.staff_id || !formData.cluster_id || !formData.shift_id) return toast.error('Vui lòng điền đủ thông tin')
    try {
      await staffWorkRosterApi.create(formData)
      toast.success('Đã gán roster thành công')
      setIsModalOpen(false)
      fetchData()
    } catch (err: any) { toast.error(err.response?.data?.message || 'Lỗi tạo roster') }
  }

  return (
    <div>
      <SectionHeader title="Roster Cleaner" description="Gán nhân viên dọn dẹp vào cụm Pod (Cluster) cố định." onRefresh={fetchData} isLoading={isLoading}
        rightAction={
          <button onClick={() => { setFormData({ staff_id: '', cluster_id: '', shift_id: '' }); setIsModalOpen(true) }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
            <Plus className="w-4 h-4" /> Thêm Roster
          </button>
        }
      />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-700">Cleaner</th>
              <th className="px-6 py-4 font-bold text-gray-700">Cluster</th>
              <th className="px-6 py-4 font-bold text-gray-700">Ca Trực</th>
              <th className="px-6 py-4 font-bold text-gray-700 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rosters.map(r => {
              const c = cleaners.find(x => x.id === r.staff_id || x._id === r.staff_id)
              const cl = clusters.find(x => x.id === r.cluster_id)
              const s = shifts.find(x => x.id === r.shift_id)
              const colors = getShiftColor(s?.shift_name || '')
              return (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{c?.name || r.staff_id}</div>
                    <div className="text-xs text-gray-500 font-mono">{c?.id}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700">{cl?.name || 'N/A'}</td>
                  <td className="px-6 py-4">
                    {s ? <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>{s.shift_name} ({s.start_time}-{s.end_time})</span> : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(r.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Gán Roster Cleaner" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nhân Viên Dọn Dẹp</label>
            <select value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500">
              <option value="">-- Chọn Cleaner --</option>
              {cleaners.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cluster</label>
            <select value={formData.cluster_id} onChange={e => setFormData({...formData, cluster_id: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Cluster --</option>
              {clusters.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Ca Trực (từ Location cha: {locShifts.filter(ls => ls.location_id === locationId).length} ca)</label>
            <select value={formData.shift_id} onChange={e => setFormData({...formData, shift_id: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Ca Trực --</option>
              {shifts.filter(s => locShifts.some(ls => ls.location_id === locationId && ls.shift_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.shift_name} ({s.start_time}-{s.end_time})</option>)}
            </select>
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">Hủy</button>
            <button onClick={handleSubmit} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Gán Roster</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ========== TAB 4: ATTENDANCE (Live Logs) ==========
const AttendanceTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const { locationId } = useManagerScope()
  const [logs, setLogs] = useState<StaffAttendanceLogItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))

  const fetchLogs = async () => {
    if (!locationId) return
    try {
      setIsLoading(true)
      const res = await staffAttendanceLogApi.getAll({ location_id: locationId, date: selectedDate, limit: 100 })
      setLogs((res.data || []).filter(l => l.staff?.role === 'cleaner'))
    } catch { toast.error('Lỗi tải nhật ký điểm danh') } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [locationId, selectedDate, refreshTrigger])

  const groupedLogs = logs.reduce((acc: any, log) => {
    const key = log.staff_id
    if (!acc[key]) acc[key] = { staff: log.staff, checkin: null, checkout: null, cluster: '' }
    if (log.action === 'CHECKIN') acc[key].checkin = log
    if (log.action === 'CHECKOUT') acc[key].checkout = log
    acc[key].cluster = log.cluster?.name || 'N/A'
    return acc
  }, {})

  return (
    <div>
      <SectionHeader title="Điểm Danh Cleaner" description="Xem trạng thái làm việc của nhân viên dọn dẹp hôm nay." onRefresh={fetchLogs} isLoading={isLoading}
        rightAction={
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0" />
          </div>
        }
      />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-700">Cleaner</th>
              <th className="px-6 py-4 font-bold text-gray-700">Cụm (Cluster)</th>
              <th className="px-6 py-4 font-bold text-gray-700 text-center">Check-in</th>
              <th className="px-6 py-4 font-bold text-gray-700 text-center">Check-out</th>
              <th className="px-6 py-4 font-bold text-gray-700 text-right">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Object.values(groupedLogs).map((entry: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{entry.staff?.name || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{entry.staff?.email}</div>
                </td>
                <td className="px-6 py-4 font-medium text-gray-600">{entry.cluster}</td>
                <td className="px-6 py-4 text-center">
                  {entry.checkin ? <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-lg font-bold text-xs"><LogIn className="w-3 h-3" /> {dayjs(entry.checkin.created_at).format('HH:mm')}</span> : <span className="text-gray-300">-</span>}
                </td>
                <td className="px-6 py-4 text-center">
                  {entry.checkout ? <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold text-xs"><LogOut className="w-3 h-3" /> {dayjs(entry.checkout.created_at).format('HH:mm')}</span> : <span className="text-gray-300">-</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  {entry.checkin && !entry.checkout ? <span className="text-xs font-bold text-green-500 uppercase">Đang làm việc</span> : entry.checkout ? <span className="text-xs font-bold text-gray-400 uppercase">Đã xong</span> : <span className="text-xs font-bold text-amber-500 uppercase">Vắng mặt</span>}
                </td>
              </tr>
            ))}
            {Object.keys(groupedLogs).length === 0 && !isLoading && <tr><td colSpan={5} className="p-12 text-center text-gray-400">Không có dữ liệu điểm danh ngày {selectedDate}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const ManagerShiftManagement = () => {
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
    { id: 'LOCATION_SHIFTS', label: 'Ca Tại Location', icon: <MapPin className="w-4 h-4" /> },
    { id: 'ROSTERS', label: 'Roster Cleaner', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'ATTENDANCE', label: 'Điểm Danh', icon: <LogIn className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Quản Lý Ca Trực (Cleaner)</h1>
          <p className="text-gray-500 font-medium">Gán lịch trực cố định cho nhân viên dọn dẹp tại các Cluster.</p>
        </div>

        <div className="flex gap-2 p-1.5 bg-white border border-gray-100 rounded-2xl mb-8 w-fit shadow-sm">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}>
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
