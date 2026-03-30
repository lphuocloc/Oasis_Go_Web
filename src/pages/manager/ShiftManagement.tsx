import React, { useEffect, useMemo, useState } from 'react'
import { Clock, MapPin, Calendar, CalendarDays, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react'
import { DatePicker, TimePicker } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import { useManagerScope } from '../../contexts/ManagerScopeContext'

import { staffShiftApi, type StaffShiftItem, type StaffShiftName } from '../../api/lib/staffShiftApi'
import { locationShiftApi, type LocationShiftItem } from '../../api/lib/locationShiftApi'
import { staffWorkRosterApi, type StaffWorkRosterItem } from '../../api/lib/staffWorkRosterApi'
import { staffShiftAssignmentApi, type StaffShiftAssignmentItem } from '../../api/lib/staffShiftAssignmentApi'
import { userApi, type UserItem } from '../../api/lib/userApi'

type TabType = 'STAFF_SHIFTS' | 'LOCATION_SHIFTS' | 'ROSTERS' | 'ASSIGNMENTS'

// ========== SHARED COMPONENTS ==========

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

const toTimePickerValue = (timeValue: string): Dayjs | null => {
  if (!timeValue) return null
  const [hourRaw, minuteRaw] = timeValue.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return dayjs().hour(hour).minute(minute).second(0).millisecond(0)
}

// ========== TAB 1: STAFF SHIFTS ==========

function StaffShiftsTab() {
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [formData, setFormData] = useState<{ shift_name: StaffShiftName, start_time: string, end_time: string }>({ shift_name: 'MORNING', start_time: '', end_time: '' })

  const fetchShifts = async () => {
    try {
      setIsLoading(true)
      const res = await staffShiftApi.getAll({ role: 'CLEANER' })
      setShifts(res.data)
    } catch {
      toast.error('Failed to load staff shifts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchShifts()
  }, [])

  const handleOpen = (shift?: StaffShiftItem) => {
    if (shift) {
      setEditId(shift.id)
      setFormData({ shift_name: shift.shift_name, start_time: shift.start_time, end_time: shift.end_time })
    } else {
      setEditId(null)
      setFormData({ shift_name: 'MORNING', start_time: '', end_time: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.shift_name || !formData.start_time || !formData.end_time) {
      toast.error('Please fill all fields')
      return
    }
    try {
      setIsSaving(true)
      if (editId) {
        await staffShiftApi.update(editId, { ...formData, role: 'CLEANER' })
        toast.success('Shift updated')
      } else {
        await staffShiftApi.create({ ...formData, role: 'CLEANER' })
        toast.success('Shift created')
      }
      setIsModalOpen(false)
      fetchShifts()
    } catch {
      toast.error('Failed to save shift')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <SectionHeader 
        title="Cleaner Shift Templates" 
        description="Define standard shift formats for cleaners (Morning, Night, etc)."
        onRefresh={fetchShifts}
        isLoading={isLoading}
        rightAction={
          <button onClick={() => handleOpen()} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Create Shift
          </button>
        }
      />

      {shifts.length === 0 && !isLoading ? <EmptyState message="No shifts found. Create one to get started." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map(shift => (
            <div key={shift.id} className="bg-white border text-left border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">{shift.shift_name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>{shift.start_time} - {shift.end_time}</span>
              </div>
              <div className="flex justify-end pt-3 border-t border-gray-50">
                <button onClick={() => handleOpen(shift)} className="text-gray-400 hover:text-blue-600 transition p-1">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Shift" : "Create Shift"} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
            <select value={formData.shift_name} onChange={e => setFormData({ ...formData, shift_name: e.target.value as StaffShiftName })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              <option value="MORNING">Morning</option>
              <option value="AFTERNOON">Afternoon</option>
              <option value="NIGHT">Night</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <TimePicker
                value={toTimePickerValue(formData.start_time)}
                format="HH:mm"
                onChange={(value) => setFormData({ ...formData, start_time: value ? value.format('HH:mm') : '' })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <TimePicker
                value={toTimePickerValue(formData.end_time)}
                format="HH:mm"
                onChange={(value) => setFormData({ ...formData, end_time: value ? value.format('HH:mm') : '' })}
                className="w-full"
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={isSaving} onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ========== TAB 2: LOCATION SHIFTS ==========

function LocationShiftsTab() {
  const { clusters, locationOptions } = useManagerScope()
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
      toast.error('Failed to load location shifts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (clusters.length > 0) fetchAll()
  }, [clusters])

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this shift mapping?')) return
    try {
      await locationShiftApi.delete(id)
      toast.success('Removed mapping')
      fetchAll()
    } catch {
      toast.error('Failed to remove')
    }
  }

  const handleSubmit = async () => {
    if (!formData.location_id || !formData.shift_id) return toast.error('Fill all fields')
    try {
      await locationShiftApi.create(formData)
      toast.success('Location shift created')
      setIsModalOpen(false)
      fetchAll()
    } catch {
      toast.error('Failed to create')
    }
  }

  return (
    <div>
      <SectionHeader 
        title="Location Bindings" 
        description="Activate shift templates for your specific locations."
        onRefresh={fetchAll}
        isLoading={isLoading}
        rightAction={
          <button onClick={() => { setFormData({ location_id: locationOptions[0]?.id || '', shift_id: shifts[0]?.id || '' }); setIsModalOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
            <Plus className="w-4 h-4" /> Bind Location
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-500">Location</th>
              <th className="px-6 py-4 font-medium text-gray-500">Shift Name</th>
              <th className="px-6 py-4 font-medium text-gray-500">Time Range</th>
              <th className="px-6 py-4 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(item => {
              const location = locationOptions.find(l => l.id === item.location_id)
              const shift = shifts.find(s => s.id === item.shift_id)
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{location?.name || 'Unknown Location'}</td>
                  <td className="px-6 py-4">{shift?.shift_name || 'Unknown Shift'}</td>
                  <td className="px-6 py-4 text-gray-500">{shift ? `${shift.start_time} - ${shift.end_time}` : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && !isLoading && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No bindings found</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Bind Shift to Location" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Location</label>
            <select disabled={locationOptions.length === 1} value={formData.location_id} onChange={e => setFormData({ ...formData, location_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-white disabled:bg-gray-100 disabled:text-gray-500">
              <option value="" disabled>Choose Location</option>
              {locationOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Template</label>
            <select value={formData.shift_id} onChange={e => setFormData({ ...formData, shift_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500">
              <option value="" disabled>Choose Shift</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name} ({s.start_time}-{s.end_time})</option>)}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-gray-600">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Submit</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ========== TAB 3: ROSTERS ==========

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function RostersTab() {
  const { locationOptions } = useManagerScope()
  const [rosters, setRosters] = useState<StaffWorkRosterItem[]>([])
  const [cleaners, setCleaners] = useState<UserItem[]>([])
  const [locShifts, setLocShifts] = useState<LocationShiftItem[]>([])
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [formData, setFormData] = useState<{ staff_id: string, location_shift_id: string, days_of_week: number[] }>({
    staff_id: '', location_shift_id: '', days_of_week: []
  })

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

      // Fetch rosters for these loc shifts
      if (myLocShifts.length > 0) {
        const rRes = await staffWorkRosterApi.getAll()
        const myLocShiftIds = myLocShifts.map((x: LocationShiftItem) => x.id)
        setRosters(rRes.data.filter((r: StaffWorkRosterItem) => myLocShiftIds.includes(r.location_shift_id)))
      }
    } catch {
      toast.error('Failed to load roster data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (locationOptions.length > 0) fetchAll()
  }, [locationOptions])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete roster entry?')) return
    await staffWorkRosterApi.delete(id)
    toast.success('Deleted')
    fetchAll()
  }

  const toggleDay = (dayIndex: number) => {
    setFormData(prev => {
      const days = prev.days_of_week.includes(dayIndex) 
        ? prev.days_of_week.filter(d => d !== dayIndex)
        : [...prev.days_of_week, dayIndex]
      return { ...prev, days_of_week: days }
    })
  }

  const handleSubmit = async () => {
    if (!formData.staff_id || !formData.location_shift_id || formData.days_of_week.length === 0) return toast.error('Fill required fields')
    try {
      await staffWorkRosterApi.create(formData)
      toast.success('Roster created')
      setIsModalOpen(false)
      fetchAll()
    } catch {
      toast.error('Failed to create roster')
    }
  }

  return (
    <div>
      <SectionHeader 
        title="Weekly Rosters" 
        description="Set up recurring weekly schedules for cleaners."
        onRefresh={fetchAll}
        isLoading={isLoading}
        rightAction={
          <button onClick={() => { setFormData({ staff_id: cleaners[0]?.id || cleaners[0]?._id || '', location_shift_id: locShifts[0]?.id || '', days_of_week: [] }); setIsModalOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            <CalendarDays className="w-4 h-4" /> Assign Roster
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-500">Cleaner</th>
              <th className="px-6 py-4 font-medium text-gray-500">Location Shift</th>
              <th className="px-6 py-4 font-medium text-gray-500">Day of Week</th>
              <th className="px-6 py-4 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rosters.map(r => {
              const cleaner = cleaners.find(c => c.id === r.staff_id || c._id === r.staff_id)
              const locShift = locShifts.find(ls => ls.id === r.location_shift_id)
              const location = locationOptions.find(opt => opt.id === locShift?.location_id)
              const shift = shifts.find(s => s.id === locShift?.shift_id)
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{cleaner?.name || 'Unknown'}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{location?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{shift?.shift_name} ({shift?.start_time}-{shift?.end_time})</div>
                  </td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded text-xs">{DAYS_OF_WEEK[r.day_of_week]}</span></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              )
            })}
            {rosters.length === 0 && !isLoading && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No rosters set</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Roster" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cleaner</label>
            <select value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="" disabled>Select Cleaner</option>
              {cleaners.map((c) => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Shift (Location + Time)</label>
            <select value={formData.location_shift_id} onChange={e => setFormData({ ...formData, location_shift_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="" disabled>Select Shift</option>
              {locShifts.map((ls) => {
                const opt = locationOptions.find(x => x.id === ls.location_id)
                const s = shifts.find(x => x.id === ls.shift_id)
                return <option key={ls.id} value={ls.id}>{opt?.name} - {s?.shift_name} ({s?.start_time})</option>
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(idx)}
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
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-gray-600">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Submit</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ========== TAB 4: ASSIGNMENTS ==========

function AssignmentsTab() {
  const { locationOptions } = useManagerScope()
  const [assignments, setAssignments] = useState<StaffShiftAssignmentItem[]>([])
  const [cleaners, setCleaners] = useState<UserItem[]>([])
  const [locShifts, setLocShifts] = useState<LocationShiftItem[]>([])
  const [shifts, setShifts] = useState<StaffShiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ staff_id: '', location_shift_id: '', start_date: '', end_date: '' })

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

      if (myLocShifts.length > 0) {
        const myLocShiftIds = myLocShifts.map((x: LocationShiftItem) => x.id)
        // Wait, AssignmentAPI getAll doesn't filter by multiple location_shift_ids easily without many calls,
        // Since it's manager scope, we fetch all and filter client side.
        const aRes = await staffShiftAssignmentApi.getAll()
        setAssignments(aRes.data.filter((a: StaffShiftAssignmentItem) => myLocShiftIds.includes(a.location_shift_id)))
      }
    } catch {
      toast.error('Failed to load assignments')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (locationOptions.length > 0) fetchAll()
  }, [locationOptions])

  const handleDelete = async (id: string) => {
    if (!confirm('Confirm delete assignment?')) return
    await staffShiftAssignmentApi.delete(id)
    toast.success('Deleted')
    fetchAll()
  }

  const handleSubmit = async () => {
    if (!formData.staff_id || !formData.location_shift_id || !formData.start_date || !formData.end_date) return toast.error('Fill required fields')
    try {
      await staffShiftAssignmentApi.create(formData)
      toast.success('Assignment created')
      setIsModalOpen(false)
      fetchAll()
    } catch {
      toast.error('Failed to create assignment')
    }
  }

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (dateFilter.start && a.start_date < dateFilter.start) return false
      if (dateFilter.end && a.start_date > dateFilter.end) return false
      return true
    })
  }, [assignments, dateFilter])

  return (
    <div>
      <SectionHeader 
        title="Date-Range Assignments" 
        description="Manually override or push fixed schedules for specific date blocks."
        onRefresh={fetchAll}
        isLoading={isLoading}
        rightAction={
          <button onClick={() => { setFormData({ staff_id: cleaners[0]?.id || cleaners[0]?._id || '', location_shift_id: locShifts[0]?.id || '', start_date: '', end_date: '' }); setIsModalOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
            <Plus className="w-4 h-4" /> Create Assignment
          </button>
        }
      />

      <div className="flex gap-4 mb-4 items-center">
        <DatePicker
          value={dateFilter.start ? dayjs(dateFilter.start) : null}
          format="YYYY-MM-DD"
          onChange={(value) => setDateFilter(prev => ({ ...prev, start: value ? value.format('YYYY-MM-DD') : '' }))}
        />
        <span className="self-center text-gray-500 text-sm">to</span>
        <DatePicker
          value={dateFilter.end ? dayjs(dateFilter.end) : null}
          format="YYYY-MM-DD"
          onChange={(value) => setDateFilter(prev => ({ ...prev, end: value ? value.format('YYYY-MM-DD') : '' }))}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-500">Cleaner</th>
              <th className="px-6 py-4 font-medium text-gray-500">Dates</th>
              <th className="px-6 py-4 font-medium text-gray-500">Location Shift</th>
              <th className="px-6 py-4 font-medium text-gray-500">Status</th>
              <th className="px-6 py-4 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredAssignments.map(a => {
              const cleaner = cleaners.find(c => c.id === a.staff_id || c._id === a.staff_id)
              const locShift = locShifts.find(ls => ls.id === a.location_shift_id)
              const location = locationOptions.find(opt => opt.id === locShift?.location_id)
              const shift = shifts.find(s => s.id === locShift?.shift_id)
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{cleaner?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(a.start_date).toLocaleDateString()} &rarr; {new Date(a.end_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{location?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{shift?.shift_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                      a.status === 'ASSIGNED' ? 'bg-amber-50 text-amber-700' :
                      a.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              )
            })}
            {filteredAssignments.length === 0 && !isLoading && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No matching assignments</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Day Assignment" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cleaner</label>
            <select value={formData.staff_id} onChange={e => setFormData({ ...formData, staff_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white">
              <option value="" disabled>Select Cleaner</option>
              {cleaners.map((c) => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Shift</label>
            <select value={formData.location_shift_id} onChange={e => setFormData({ ...formData, location_shift_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white">
              <option value="" disabled>Select Shift</option>
              {locShifts.map((ls) => {
                const opt = locationOptions.find(x => x.id === ls.location_id)
                const s = shifts.find(x => x.id === ls.shift_id)
                return <option key={ls.id} value={ls.id}>{opt?.name} - {s?.shift_name}</option>
              })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <DatePicker
                value={formData.start_date ? dayjs(formData.start_date) : null}
                format="YYYY-MM-DD"
                onChange={(value) => setFormData({ ...formData, start_date: value ? value.format('YYYY-MM-DD') : '' })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <DatePicker
                value={formData.end_date ? dayjs(formData.end_date) : null}
                format="YYYY-MM-DD"
                onChange={(value) => setFormData({ ...formData, end_date: value ? value.format('YYYY-MM-DD') : '' })}
                className="w-full"
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg text-gray-600">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Submit</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ========== MAIN COMPONENT ==========

export const ShiftManagement = () => {
  const [activeTab, setActiveTab] = useState<TabType>('STAFF_SHIFTS')

  const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'STAFF_SHIFTS', label: 'Shift Templates', icon: <Clock className="w-4 h-4" /> },
    { id: 'LOCATION_SHIFTS', label: 'Location Bindings', icon: <MapPin className="w-4 h-4" /> },
    { id: 'ROSTERS', label: 'Weekly Roster', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'ASSIGNMENTS', label: 'Daily Assignments', icon: <Calendar className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Banner */}
      <div className="bg-white border-b border-gray-200 px-8 py-8 pt-12">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Shift Management</h1>
        <p className="text-gray-500 mt-2 max-w-2xl text-base">
          Manage your cleaner workforce schedules seamlessly. Define shift templates, link them to specific locations, build recurring rosters, and oversee daily shift assignments all in one place.
        </p>

        <div className="mt-8 flex gap-2 border-b border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-4 flex items-center gap-2 font-medium text-sm transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 flex-1">
        {activeTab === 'STAFF_SHIFTS' && <StaffShiftsTab />}
        {activeTab === 'LOCATION_SHIFTS' && <LocationShiftsTab />}
        {activeTab === 'ROSTERS' && <RostersTab />}
        {activeTab === 'ASSIGNMENTS' && <AssignmentsTab />}
      </div>
    </div>
  )
}
