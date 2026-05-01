import React, { useEffect, useState } from 'react'
import { Clock, MapPin, CalendarDays, Plus, Trash2, RefreshCw, LogIn, LogOut, CheckCircle } from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { useAuth } from '../../contexts/AuthContext'

import { staffShiftApi, type StaffShiftItem } from '../../api/lib/staffShiftApi'
import { locationShiftApi, type LocationShiftItem } from '../../api/lib/locationShiftApi'
import { staffWorkRosterApi, type StaffWorkRosterItem } from '../../api/lib/staffWorkRosterApi'
import { staffAttendanceLogApi, type StaffAttendanceLogItem } from '../../api/lib/staffAttendanceLogApi'
import { userApi, type UserListItem } from '../../api/lib/userApi'
import { podClusterApi, type PodClusterItem } from '../../api/lib/podClusterApi'
import { initUserSocket } from '../../lib/socket'
import { locationApi, type LocationItem } from '../../api/lib/locationApi'
import { shiftHandoverApi } from '../../api/lib/shiftHandoverApi'
import { FileText, ClipboardList } from 'lucide-react'

const LocationSelector = () => {
  const { locationOptions, selectedLocationId, setSelectedLocationId, isLoading } = useManagerScope()

  if (isLoading) return <div className="h-10 w-48 bg-gray-100 animate-pulse rounded-xl" />
  if (locationOptions.length === 0) return null

  return (
    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
      <div className="pl-3 pr-1 py-1 border-r border-gray-100">
        <MapPin className="w-4 h-4 text-blue-500" />
      </div>
      <select
        value={selectedLocationId || ''}
        onChange={e => setSelectedLocationId(e.target.value)}
        className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 pr-8"
      >
        {locationOptions.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.name}</option>
        ))}
      </select>
    </div>
  )
}

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

const FIXED_SHIFT_DATA: Record<string, { name: string, start: string, end: string }> = {
  'CA SÁNG': { name: 'Ca Sáng', start: '06:00', end: '12:00' },
  'CA CHIỀU': { name: 'Ca Chiều', start: '12:00', end: '18:00' },
  'CA TỐI': { name: 'Ca Tối', start: '18:00', end: '00:00' },
  'CA ĐÊM': { name: 'Ca Đêm', start: '00:00', end: '06:00' },
}

// ========== MANAGER ATTENDANCE WIDGET (Status + Checkout) ==========
const ManagerAttendanceWidget = () => {
  const [status, setStatus] = useState<{
    checked_in_today: boolean
    checked_out_today: boolean
    latest_checkin_at: string | null
    latest_checkout_at: string | null
    has_handover: boolean
    shift_ids: string[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActing, setIsActing] = useState(false)
  const [showHandoverModal, setShowHandoverModal] = useState(false)
  const [handoverNote, setHandoverNote] = useState('')

  const fetchStatus = async (bustCache = true) => {
    try {
      const res = await staffAttendanceLogApi.getTodayStatus(bustCache)
      setStatus(res.data)
    } catch { setStatus(null) } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchStatus(true) }, [])

  const handleHandover = async () => {
    if (!handoverNote.trim()) return toast.warning('Vui lòng nhập nội dung bàn giao')
    if (!status?.shift_ids?.length) return toast.error('Không tìm thấy ca trực để bàn giao')

    setIsActing(true)
    try {
      await shiftHandoverApi.create({
        note_text: handoverNote
      })
      toast.success('Đã gửi bàn giao ca thành công!')
      setHandoverNote('')
      setShowHandoverModal(false)
      fetchStatus()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Gửi bàn giao thất bại')
    } finally { setIsActing(false) }
  }

  const handleCheckout = async () => {
    setIsActing(true)
    try {
      await staffAttendanceLogApi.checkout()
      toast.success('Đã check-out thành công! Hẹn gặp lại.')
      fetchStatus()
    } catch (e: any) {
      const msg = e?.response?.data?.message || ''
      if (msg.toLowerCase().includes('ngoài khung giờ') || msg.toLowerCase().includes('outside') || e?.response?.status === 400) {
        toast.error(`⏰ ${msg || 'Thời điểm hiện tại nằm ngoài khung giờ ca trực'}. Vui lòng check-out trong giờ ca của bạn.`)
      } else {
        toast.error(msg || 'Check-out thất bại')
      }
    }
    finally { setIsActing(false) }
  }

  if (isLoading) return <div className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse mb-6" />
  if (!status?.checked_in_today) return null // Gate handles the unchecked-in state

  const isActive = status.checked_in_today && !status.checked_out_today
  const needsHandover = isActive && !status.has_handover

  return (
    <>
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl border-2 mb-6 ${
        isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
            {isActive ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-gray-500" />}
          </div>
          <div>
            <div className={`text-sm font-bold ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
              {isActive ? '🟢 Đang làm việc' : '⚪ Đã kết thúc ca'}
            </div>
            <div className="text-xs text-gray-400">
              Check-in: <strong>{dayjs(status.latest_checkin_at).format('HH:mm')}</strong>
              {status.latest_checkout_at && <> · Check-out: <strong>{dayjs(status.latest_checkout_at).format('HH:mm')}</strong></>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {needsHandover && (
            <button onClick={() => setShowHandoverModal(true)} disabled={isActing}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-100 disabled:opacity-60">
              <ClipboardList className="w-4 h-4" /> Bàn Giao Công Việc
            </button>
          )}

          {isActive && status.has_handover && (
            <button onClick={handleCheckout} disabled={isActing}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-rose-100 disabled:opacity-60">
              <LogOut className="w-4 h-4" /> Kết Thúc Ca (Check-out)
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        title="Bàn Giao Ca Trực"
        footer={(
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowHandoverModal(false)} className="px-4 py-2 text-gray-500 font-bold">Hủy</button>
            <button onClick={handleHandover} disabled={isActing} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">
              Gửi Bàn Giao
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Vui lòng nhập tóm tắt công việc đã thực hiện, các vấn đề phát sinh hoặc lưu ý cho ca sau.
          </p>
          <textarea
            className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm"
            placeholder="Ví dụ: Đã kiểm tra các Pod tầng 1, có một vòi nước rò rỉ tại khu B..."
            value={handoverNote}
            onChange={e => setHandoverNote(e.target.value)}
          />
        </div>
      </Modal>
    </>
  )
}


const LocationShiftsTab = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const { locationId } = useManagerScope()
  const [locShifts, setLocShifts] = useState<LocationShiftItem[]>([])
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [rosters, setRosters] = useState<StaffWorkRosterItem[]>([])
  const [cleaners, setCleaners] = useState<UserListItem[]>([])
  const [clusters, setClusters] = useState<PodClusterItem[]>([])
  const [allLocations, setAllLocations] = useState<LocationItem[]>([])
  const [attendanceLogs, setAttendanceLogs] = useState<StaffAttendanceLogItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = async () => {
    if (!locationId) return
    try {
      setIsLoading(true)
      const [lsRes, sRes, rRes, cRes, mRes, lAllRes, clRes, attRes] = await Promise.all([
        locationShiftApi.getAll().catch(() => ({ data: [] })),
        staffShiftApi.getAll().catch(() => ({ data: [] })),
        staffWorkRosterApi.getAll().catch(() => ({ data: [] })),
        userApi.getActiveUsers('cleaner').catch(() => ({ data: [] })),
        userApi.getActiveUsers('manager').catch(() => ({ data: [] })),
        locationApi.getAll().catch(() => ({ data: [] })),
        podClusterApi.getAll(locationId).catch(() => ({ data: [] })),
        staffAttendanceLogApi.getAll({ 
          location_id: locationId, 
          from_date: dayjs().startOf('day').toISOString(),
          to_date: dayjs().endOf('day').toISOString() 
        }).catch(() => ({ data: [] }))
      ])

      setAttendanceLogs(attRes.data || [])

      const locations = lAllRes.data || []
      setAllLocations(locations)
      
      const allStaff = [...(cRes.data || []), ...(mRes.data || [])]

      const currentLoc = locations.find(l => l.id === locationId)
      const parentId = currentLoc?.parent_id
      
      const filteredLocShifts = (lsRes.data || []).filter(ls => ls.location_id === locationId || (parentId && ls.location_id === parentId))
      const rosterShifts = (rRes.data || []).filter(r => r.location_id === locationId)
      
      const allShiftIds = [...new Set([
        ...filteredLocShifts.map(ls => ls.shift_id),
        ...rosterShifts.map(r => r.shift_id)
      ])]
      
      const displayShifts: LocationShiftItem[] = allShiftIds.map(sid => {
        const existingLs = filteredLocShifts.find(ls => ls.shift_id === sid)
        if (existingLs) return existingLs
        return { id: `mock-${sid}`, location_id: locationId, shift_id: sid }
      })
      
      let finalShifts = sRes.data || []
      const missingShiftIds = allShiftIds.filter(id => !finalShifts.some(s => s.id === id))
      if (missingShiftIds.length > 0) {
        const missingShifts = await Promise.all(
          missingShiftIds.map(id => staffShiftApi.getById(id).then(r => r.data).catch(() => null))
        )
        finalShifts = [...finalShifts, ...missingShifts.filter((s): s is StaffShiftItem => s !== null)]
      }
      
      const validDisplayShifts = displayShifts.filter(ls => finalShifts.some(s => s.id === ls.shift_id))
      setLocShifts(validDisplayShifts)
      setShifts(finalShifts)
      setRosters(rRes.data || [])
      setCleaners(allStaff)
      setClusters(clRes.data || [])
    } catch { toast.error('Lỗi tải dữ liệu') } finally { setIsLoading(false) }
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
              <th className="px-6 py-4 font-bold text-gray-700">Nhân Viên Đang Trực</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {locShifts.map(ls => {
              const shift = ls.shift || shifts.find(s => s.id === ls.shift_id)
              const shiftName = shift?.shift_name || ls.shift_id
              const colors = getShiftColor(shiftName)
              const fixed = FIXED_SHIFT_DATA[shiftName]
              return (
                <tr key={ls.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {fixed?.name || shiftName}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-700">
                    {fixed ? `${fixed.start} - ${fixed.end}` : (shift ? `${shift.start_time} - ${shift.end_time}` : '—')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {rosters
                        .filter(r => r.shift_id === ls.shift_id && (r.location_id === locationId || clusters.some(cl => cl.id === r.cluster_id)))
                        .map(r => {
                          const c = cleaners.find(x => x.id === r.staff_id || x._id === r.staff_id)
                          const cl = clusters.find(x => x.id === r.cluster_id)
                          
                          // Determine actual status from logs
                          const logs = attendanceLogs.filter(l => l.staff_id === r.staff_id && l.shift_id === r.shift_id)
                          const hasCheckin = logs.some(l => l.action === 'CHECKIN')
                          const hasCheckout = logs.some(l => l.action === 'CHECKOUT')
                          
                          // Time check
                          const now = dayjs()
                          let isPastEnd = false
                          if (shift) {
                            const [eh, em] = (shift.end_time || '00:00').split(':').map(Number)
                            let end = dayjs().hour(eh).minute(em).second(0)
                            if (shift.start_time && shift.end_time && shift.end_time <= shift.start_time) {
                              // Crosses midnight
                              if (now.hour() >= 12) end = end.add(1, 'day')
                              else end = end.subtract(0, 'day') // Current day early morning
                            }
                            isPastEnd = now.isAfter(end)
                          }

                          let statusColor = 'bg-gray-300' // Default: Not in shift
                          let statusText = ''

                          if (hasCheckout) {
                            statusColor = 'bg-blue-400'
                            statusText = 'Đã hoàn thành'
                          } else if (hasCheckin) {
                            if (isPastEnd) {
                              statusColor = 'bg-rose-500 animate-pulse'
                              statusText = 'Quá giờ / Chưa tan ca'
                            } else {
                              statusColor = 'bg-green-500'
                              statusText = 'Đang trực'
                            }
                          } else if (isPastEnd) {
                            statusColor = 'bg-gray-400'
                            statusText = 'Vắng mặt'
                          }

                          return (
                            <div key={r.id} className="flex flex-col gap-0.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 group relative">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} title={statusText} />
                                <span className="text-xs font-bold text-gray-900">{c?.name || 'Unknown'}</span>
                              </div>
                              {cl && <span className="text-[10px] text-gray-400 font-bold ml-3 uppercase">{cl.name}</span>}
                              
                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl">
                                  {statusText || 'Chưa vào ca'}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      {rosters.filter(r => r.shift_id === ls.shift_id && (r.location_id === locationId || clusters.some(cl => cl.id === r.cluster_id))).length === 0 && (
                        <span className="text-xs text-gray-400 italic">Trống</span>
                      )}
                    </div>
                  </td>
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
  const [isTemporaryModalOpen, setIsTemporaryModalOpen] = useState(false)
  const [formData, setFormData] = useState({ staff_id: '', cluster_id: '', shift_id: '' })
  const [managerShiftIds, setManagerShiftIds] = useState<string[]>([])
  const { user } = useAuth()

  const fetchData = async () => {
    if (!locationId) return
    try {
      setIsLoading(true)
      const [rRes, cRes, clRes, lsRes, sRes, lAllRes] = await Promise.all([
        staffWorkRosterApi.getAll().catch(() => ({ data: [] })),
        userApi.getActiveUsers('cleaner').catch(() => ({ data: [] })),
        podClusterApi.getAll(locationId).catch(() => ({ data: [] })),
        locationShiftApi.getAll().catch(() => ({ data: [] })),
        staffShiftApi.getAll().catch(() => ({ data: [] })),
        locationApi.getAll().catch(() => ({ data: [] }))
      ])
      const allRosters = rRes.data || []
      const clusterIds = (clRes.data || []).map(x => x.id)
      setRosters(allRosters.filter(r => clusterIds.includes(r.cluster_id || '')))
      
      // Derive manager's own shifts from the full roster list
      const myShifts = allRosters.filter(r => r.staff_id === user?.id).map(r => r.shift_id)
      setManagerShiftIds(myShifts)
      
      // Only cleaners can be assigned by manager
      setCleaners(cRes.data || [])
      setClusters(clRes.data || [])

      const locations = lAllRes.data || []
      const currentLoc = locations.find(l => l.id === locationId)
      const parentId = currentLoc?.parent_id
      
      const filteredLocShifts = (lsRes.data || []).filter(ls => ls.location_id === locationId || (parentId && ls.location_id === parentId))
      const rosterShifts = (rRes.data || []).filter(r => r.location_id === locationId)
      
      const allShiftIds = [...new Set([
        ...filteredLocShifts.map(ls => ls.shift_id),
        ...rosterShifts.map(r => r.shift_id)
      ])]
      
      const displayShifts: LocationShiftItem[] = allShiftIds.map(sid => {
        const existingLs = filteredLocShifts.find(ls => ls.shift_id === sid)
        if (existingLs) return existingLs
        return { id: `mock-${sid}`, location_id: locationId, shift_id: sid }
      })
      
      let finalShifts = sRes.data || []
      const missingShiftIds = allShiftIds.filter(id => !finalShifts.some(s => s.id === id))
      if (missingShiftIds.length > 0) {
        const missingShifts = await Promise.all(
          missingShiftIds.map(id => staffShiftApi.getById(id).then(r => r.data).catch(() => null))
        )
        finalShifts = [...finalShifts, ...missingShifts.filter((s): s is StaffShiftItem => s !== null)]
      }
      
      const validDisplayShifts = displayShifts.filter(ls => finalShifts.some(s => s.id === ls.shift_id))
      setLocShifts(validDisplayShifts)
      setShifts(finalShifts)
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

  const handleSubmit = async (isTemporary = false) => {
    if (!formData.staff_id || !formData.cluster_id || !formData.shift_id) return toast.error('Vui lòng điền đủ thông tin')

    const clusterCleaners = rosters.filter(r => r.cluster_id === formData.cluster_id)
    if (clusterCleaners.length >= 3 && !isTemporary) {
      return toast.error('Cụm Pod này đã đủ 3 nhân viên (tối đa 3 người/cụm)')
    }

    try {
      await staffWorkRosterApi.create({
        ...formData,
        is_temporary: isTemporary,
        work_date: isTemporary ? dayjs().format('YYYY-MM-DD') : undefined
      })
      toast.success(isTemporary ? 'Đã điều động tạm thời thành công' : 'Đã gán roster thành công')
      setIsModalOpen(false)
      setIsTemporaryModalOpen(false)
      fetchData()
    } catch (err: any) { toast.error(err.response?.data?.message || 'Lỗi tạo roster') }
  }


  const managerShifts = shifts.filter(s => managerShiftIds.includes(s.id))
  
  const availableShifts = locShifts
    .map(ls => ls.shift || shifts.find(x => x.id === ls.shift_id))
    .filter((s): s is StaffShiftItem => s !== undefined && managerShiftIds.includes(s.id))

  return (
    <div>
      <SectionHeader title="Roster Cleaner" description={`Gán nhân viên dọn dẹp vào cụm Pod (Cluster) trong khu vực của bạn. Bạn chỉ được gán vào ca trực mình đang phụ trách (${managerShiftIds.length} ca).`} onRefresh={fetchData} isLoading={isLoading}
        rightAction={
          <div className="flex gap-2">
            <button onClick={() => { setFormData({ staff_id: '', cluster_id: '', shift_id: '' }); setIsTemporaryModalOpen(true) }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-100">
              <RefreshCw className="w-4 h-4" /> Điều động tạm thời
            </button>
            <button onClick={() => { setFormData({ staff_id: '', cluster_id: '', shift_id: '' }); setIsModalOpen(true) }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
              <Plus className="w-4 h-4" /> Thêm Roster
            </button>
          </div>
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
                    {r.is_temporary && <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">Tạm thời</span>}
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
            <select value={formData.cluster_id} onChange={e => setFormData({ ...formData, cluster_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Cluster --</option>
              {clusters.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Ca Trực Của Bạn ({availableShifts.length} ca — chỉ ca bạn quản lý)</label>
            <select value={formData.shift_id} onChange={e => setFormData({ ...formData, shift_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Ca Trực --</option>
              {availableShifts.map(s => {
                return (
                  <option key={s.id} value={s.id}>
                    {s.shift_name} ({s.start_time}-{s.end_time})
                  </option>
                )
              })}
            </select>
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">Hủy</button>
            <button onClick={() => handleSubmit(false)} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Gán Roster</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isTemporaryModalOpen} onClose={() => setIsTemporaryModalOpen(false)} title="Điều Động Cleaner Tạm Thời (Trong Ngày)" size="md">
        <div className="space-y-4">
          <div className="bg-orange-50 text-orange-800 p-3 rounded-xl text-sm mb-4">
            Điều động tạm thời sẽ gán Cleaner vào Cluster mới chỉ trong ngày hôm nay. Hết ngày, Roster này sẽ tự động bị vô hiệu hóa.
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nhân Viên Dọn Dẹp</label>
            <select value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500">
              <option value="">-- Chọn Cleaner --</option>
              {cleaners.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cụm Pod Cần Hỗ Trợ (Cluster)</label>
            <select value={formData.cluster_id} onChange={e => setFormData({ ...formData, cluster_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500">
              <option value="">-- Cluster --</option>
              {clusters.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Ca Trực Của Bạn ({availableShifts.length} ca)</label>
            <select value={formData.shift_id} onChange={e => setFormData({ ...formData, shift_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500">
              <option value="">-- Ca Trực --</option>
              {availableShifts.map(s => {
                return (
                  <option key={s.id} value={s.id}>
                    {s.shift_name} ({s.start_time}-{s.end_time})
                  </option>
                )
              })}
            </select>
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <button onClick={() => setIsTemporaryModalOpen(false)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">Hủy</button>
            <button onClick={() => handleSubmit(true)} className="px-8 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all">Điều Động</button>
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
  const [activeTab, setActiveTab] = useState<TabType>('LOCATION_SHIFTS')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const socket = initUserSocket()
    if (!socket) return
    const handleRefresh = () => setRefreshTrigger(p => p + 1)
    socket.on('dashboard:refresh', handleRefresh)
    return () => { socket.off('dashboard:refresh', handleRefresh) }
  }, [])

  const TABS: { id: TabType; label: string; icon: any }[] = [
    { id: 'LOCATION_SHIFTS', label: 'Ca Tại Location', icon: <MapPin className="w-4 h-4" /> },
    { id: 'ROSTERS', label: 'Roster Cleaner', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'ATTENDANCE', label: 'Điểm Danh', icon: <LogIn className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Quản Lý Ca Trực (Cleaner)</h1>
          <p className="text-gray-500 mt-1">Gán lịch trực cố định cho nhân viên dọn dẹp tại các Cluster.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex gap-2 p-1.5 bg-white border border-gray-100 rounded-2xl w-fit shadow-sm">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <LocationSelector />
        </div>

        <ManagerAttendanceWidget />

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* {activeTab === 'STAFF_SHIFTS' && <StaffShiftsTab refreshTrigger={refreshTrigger} />} */}
          {activeTab === 'LOCATION_SHIFTS' && <LocationShiftsTab refreshTrigger={refreshTrigger} />}
          {activeTab === 'ROSTERS' && <RostersTab refreshTrigger={refreshTrigger} />}
          {activeTab === 'ATTENDANCE' && <AttendanceTab refreshTrigger={refreshTrigger} />}
        </div>
      </div>
    </div>
  )
}
