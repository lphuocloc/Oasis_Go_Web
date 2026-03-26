import { useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, Edit2, Plus, RefreshCw, Search, Trash2, WandSparkles, X } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  CLEANING_REQUEST_SOURCES,
  CLEANING_TASK_STATUSES,
  cleaningTaskApi,
  type CleaningRequestSource,
  type CleaningTaskItem,
  type CleaningTaskStatus,
  type CreateCleaningTaskPayload
} from '../../api/lib/cleaningTaskApi'
import { bookingApi, type BookingItem } from '../../api/lib/bookingApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { podClusterApi, type PodClusterItem } from '../../api/lib/podClusterApi'
import { locationShiftApi, type WorkingStaffAssignment } from '../../api/lib/locationShiftApi'
import { userApi, type UserListItem } from '../../api/lib/userApi'

type StatusFilter = CleaningTaskStatus | 'all'
type SourceFilter = CleaningRequestSource | 'all'
type QuickCleanerSource = 'assignment' | 'all_cleaners'

interface TaskFormState {
  pod_id: string
  booking_id: string
  cleaner_id: string
  shift_assignment_id: string
  request_source: CleaningRequestSource
  due_at: string
  assigned_at: string
  notified_at: string
  accepted_at: string
  start_time: string
  end_time: string
  status: CleaningTaskStatus
  note: string
  rejection_reason: string
  reassigned_from_cleaner_id: string
}

interface BackfillFormState {
  dry_run: boolean
  cleaner_access_only: boolean
  from_date: string
  to_date: string
  limit: string
}

const createEmptyTaskForm = (): TaskFormState => ({
  pod_id: '',
  booking_id: '',
  cleaner_id: '',
  shift_assignment_id: '',
  request_source: 'USER_REQUEST',
  due_at: '',
  assigned_at: '',
  notified_at: '',
  accepted_at: '',
  start_time: '',
  end_time: '',
  status: 'ASSIGNED',
  note: '',
  rejection_reason: '',
  reassigned_from_cleaner_id: ''
})

const createDefaultBackfillForm = (): BackfillFormState => ({
  dry_run: true,
  cleaner_access_only: true,
  from_date: '',
  to_date: '',
  limit: '200'
})

const formatDateValue = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN')
}

const formatDateOnly = (value?: string | null) => {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 10)
}

const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

const toIsoOrNull = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

const toPayload = (form: TaskFormState): CreateCleaningTaskPayload => {
  return {
    pod_id: form.pod_id.trim(),
    booking_id: form.booking_id.trim() || null,
    cleaner_id: form.cleaner_id.trim(),
    shift_assignment_id: form.shift_assignment_id.trim() || null,
    request_source: form.request_source,
    due_at: toIsoOrNull(form.due_at),
    assigned_at: toIsoOrNull(form.assigned_at),
    notified_at: toIsoOrNull(form.notified_at),
    accepted_at: toIsoOrNull(form.accepted_at),
    start_time: toIsoOrNull(form.start_time),
    end_time: toIsoOrNull(form.end_time),
    status: form.status,
    note: form.note.trim() || null,
    rejection_reason: form.rejection_reason.trim() || null,
    reassigned_from_cleaner_id: form.reassigned_from_cleaner_id.trim() || null
  }
}

const toFormState = (task: CleaningTaskItem): TaskFormState => ({
  pod_id: task.pod_id || '',
  booking_id: task.booking_id || '',
  cleaner_id: task.cleaner_id || '',
  shift_assignment_id: task.shift_assignment_id || '',
  request_source: task.request_source,
  due_at: toDateTimeInputValue(task.due_at),
  assigned_at: toDateTimeInputValue(task.assigned_at),
  notified_at: toDateTimeInputValue(task.notified_at),
  accepted_at: toDateTimeInputValue(task.accepted_at),
  start_time: toDateTimeInputValue(task.start_time),
  end_time: toDateTimeInputValue(task.end_time),
  status: task.status,
  note: task.note || '',
  rejection_reason: task.rejection_reason || '',
  reassigned_from_cleaner_id: task.reassigned_from_cleaner_id || ''
})

const getStaffId = (item: WorkingStaffAssignment) => item.staff?.id || item.staff?._id || ''

const formatStaffOption = (item: WorkingStaffAssignment) => {
  const name = item.staff?.name || getStaffId(item) || 'Unknown staff'
  const shiftName = item.shift?.shift_name || 'SHIFT'
  const shiftWindow = item.shift ? `${item.shift.start_time} - ${item.shift.end_time}` : 'time unavailable'
  return `${name} | ${shiftName} (${shiftWindow}) | assignment ${item.assignment_id}`
}

const getUserId = (user: UserListItem) => user.id || user._id || ''

const normalizeRole = (role?: string) => (role || '').trim().toLowerCase()

const formatCleanerOption = (user: UserListItem) => {
  const cleanerId = getUserId(user)
  const name = user.name?.trim() || 'Unknown cleaner'
  const email = user.email?.trim() || 'no-email'
  return `${name} (${email}) | ${cleanerId || 'no-id'}`
}

export const CleaningTaskManagement = () => {
  const [tasks, setTasks] = useState<CleaningTaskItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunningBackfill, setIsRunningBackfill] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [podFilter, setPodFilter] = useState('')
  const [cleanerFilter, setCleanerFilter] = useState('')
  const [bookingFilter, setBookingFilter] = useState('')

  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [pods, setPods] = useState<PodItem[]>([])
  const [clusters, setClusters] = useState<PodClusterItem[]>([])
  const [isBookingDataLoading, setIsBookingDataLoading] = useState(true)
  const [bookingSearch, setBookingSearch] = useState('')

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [selectedBookingTasks, setSelectedBookingTasks] = useState<CleaningTaskItem[]>([])
  const [isSelectedBookingTasksLoading, setIsSelectedBookingTasksLoading] = useState(false)

  const [availableStaff, setAvailableStaff] = useState<WorkingStaffAssignment[]>([])
  const [isStaffLoading, setIsStaffLoading] = useState(false)
  const [isAllCleanersLoading, setIsAllCleanersLoading] = useState(false)
  const [allCleanersLoadError, setAllCleanersLoadError] = useState('')
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [quickCleanerSource, setQuickCleanerSource] = useState<QuickCleanerSource>('assignment')
  const [allCleaners, setAllCleaners] = useState<UserListItem[]>([])
  const [selectedCleanerId, setSelectedCleanerId] = useState('')
  const [quickCreateNote, setQuickCreateNote] = useState('')
  const [isQuickCreating, setIsQuickCreating] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<CleaningTaskItem | null>(null)
  const [form, setForm] = useState<TaskFormState>(createEmptyTaskForm())
  const [modalShiftAssignments, setModalShiftAssignments] = useState<WorkingStaffAssignment[]>([])
  const [isModalShiftLoading, setIsModalShiftLoading] = useState(false)

  const [backfillForm, setBackfillForm] = useState<BackfillFormState>(createDefaultBackfillForm())
  const [backfillSummary, setBackfillSummary] = useState<{
    scanned: number
    created_count: number
    skipped_count: number
    failed_count: number
  } | null>(null)

  const podMap = useMemo(() => new Map(pods.map((pod) => [pod.id, pod])), [pods])
  const clusterMap = useMemo(() => new Map(clusters.map((cluster) => [cluster.id, cluster])), [clusters])

  const selectedBooking = useMemo(
    () => bookings.find((item) => item.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId]
  )

  const selectedBookingLocationId = useMemo(() => {
    if (!selectedBooking) return null
    const pod = podMap.get(selectedBooking.pod_id)
    if (!pod) return null
    const cluster = clusterMap.get(pod.cluster_id)
    return cluster?.location_id ?? null
  }, [clusterMap, podMap, selectedBooking])

  const selectedBookingDate = useMemo(() => {
    if (!selectedBooking) return undefined
    return formatDateOnly(selectedBooking.end_time) || formatDateOnly(selectedBooking.start_time)
  }, [selectedBooking])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      const response = await cleaningTaskApi.getAll({
        status: statusFilter,
        request_source: sourceFilter,
        pod_id: podFilter.trim() || undefined,
        cleaner_id: cleanerFilter.trim() || undefined,
        booking_id: bookingFilter.trim() || undefined
      })
      setTasks(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load cleaning tasks')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBookingData = async () => {
    try {
      setIsBookingDataLoading(true)
      const [bookingRes, podRes, clusterRes] = await Promise.all([
        bookingApi.getAll(),
        podApi.getAll(),
        podClusterApi.getAll()
      ])
      setBookings(bookingRes.data)
      setPods(podRes.data)
      setClusters(clusterRes.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load booking/staff reference data')
    } finally {
      setIsBookingDataLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sourceFilter])

  useEffect(() => {
    fetchBookingData()
  }, [])

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return tasks

    return tasks.filter((task) => {
      const haystack = [
        task.id,
        task.pod_id,
        task.booking_id,
        task.cleaner_id,
        task.shift_assignment_id,
        task.status,
        task.request_source,
        task.note,
        task.rejection_reason
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(keyword)
    })
  }, [search, tasks])

  const statusCounts = useMemo(() => {
    return CLEANING_TASK_STATUSES.reduce(
      (acc, status) => {
        acc[status] = tasks.filter((task) => task.status === status).length
        return acc
      },
      {} as Record<CleaningTaskStatus, number>
    )
  }, [tasks])

  const filteredBookings = useMemo(() => {
    const keyword = bookingSearch.trim().toLowerCase()
    if (!keyword) return bookings

    return bookings.filter((booking) => {
      const pod = podMap.get(booking.pod_id)
      const cluster = pod ? clusterMap.get(pod.cluster_id) : null
      const haystack = [
        booking.id,
        booking.order_id,
        booking.pod_id,
        booking.user_id,
        booking.status,
        cluster?.location_id
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(keyword)
    })
  }, [bookingSearch, bookings, clusterMap, podMap])

  const openCreateModal = () => {
    setEditingTask(null)
    setForm(createEmptyTaskForm())
    setModalShiftAssignments([])
    setIsModalOpen(true)
  }

  const openEditModal = (task: CleaningTaskItem) => {
    setEditingTask(task)
    setForm(toFormState(task))
    setModalShiftAssignments([])
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingTask(null)
    setForm(createEmptyTaskForm())
    setModalShiftAssignments([])
  }

  const fetchModalShiftAssignments = async (locationId: string, targetDate?: string) => {
    try {
      setIsModalShiftLoading(true)
      const response = await locationShiftApi.getWorkingStaffByLocation(locationId, {
        role: 'CLEANER',
        include_assigned: true,
        target_date: targetDate
      })
      setModalShiftAssignments(response.data)
    } catch {
      setModalShiftAssignments([])
    } finally {
      setIsModalShiftLoading(false)
    }
  }

  useEffect(() => {
    if (!isModalOpen) return

    if (allCleaners.length === 0 && !isAllCleanersLoading) {
      fetchAllCleaners()
    }

    const pod = podMap.get(form.pod_id)
    const cluster = pod ? clusterMap.get(pod.cluster_id) : null
    const locationId = cluster?.location_id
    const targetDate = formatDateOnly(form.due_at)

    if (!locationId) {
      setModalShiftAssignments([])
      return
    }

    fetchModalShiftAssignments(locationId, targetDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, form.pod_id, form.due_at, podMap, clusterMap])

  const updateForm = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validateForm = () => {
    if (!form.pod_id.trim()) {
      toast.error('pod_id is required')
      return false
    }

    if (!form.cleaner_id.trim()) {
      toast.error('cleaner_id is required')
      return false
    }

    return true
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) return

    const payload = toPayload(form)

    try {
      setIsSaving(true)
      if (editingTask) {
        await cleaningTaskApi.update(editingTask.id, payload)
        toast.success('Cleaning task updated successfully')
      } else {
        await cleaningTaskApi.create(payload)
        toast.success('Cleaning task created successfully')
      }

      closeModal()
      await fetchTasks()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save cleaning task')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (task: CleaningTaskItem) => {
    const confirmed = window.confirm(`Delete cleaning task ${task.id}?`)
    if (!confirmed) return

    try {
      await cleaningTaskApi.delete(task.id)
      toast.success('Cleaning task deleted successfully')
      await fetchTasks()
      if (selectedBooking?.id && selectedBooking.id === task.booking_id) {
        await handleSelectBooking(selectedBooking)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete cleaning task')
    }
  }

  const runBackfill = async () => {
    const limit = Number(backfillForm.limit)
    if (!Number.isFinite(limit) || limit < 1) {
      toast.error('Backfill limit must be a positive number')
      return
    }

    try {
      setIsRunningBackfill(true)
      const response = await cleaningTaskApi.backfill({
        dry_run: backfillForm.dry_run,
        cleaner_access_only: backfillForm.cleaner_access_only,
        from_date: backfillForm.from_date ? new Date(backfillForm.from_date).toISOString() : undefined,
        to_date: backfillForm.to_date ? new Date(backfillForm.to_date).toISOString() : undefined,
        limit
      })

      setBackfillSummary({
        scanned: response.data.scanned,
        created_count: response.data.created_count,
        skipped_count: response.data.skipped_count,
        failed_count: response.data.failed_count
      })

      toast.success(response.message || 'Backfill executed successfully')
      await fetchTasks()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to run backfill')
    } finally {
      setIsRunningBackfill(false)
    }
  }

  const handleSelectBooking = async (booking: BookingItem) => {
    setSelectedBookingId(booking.id)
    setSelectedBookingTasks([])
    setAvailableStaff([])
    setSelectedAssignmentId('')
    setSelectedCleanerId('')
    setAllCleanersLoadError('')
    setQuickCleanerSource('assignment')
    setQuickCreateNote('')

    try {
      setIsSelectedBookingTasksLoading(true)
      const taskResponse = await cleaningTaskApi.getAll({ booking_id: booking.id })
      setSelectedBookingTasks(taskResponse.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load selected booking tasks')
    } finally {
      setIsSelectedBookingTasksLoading(false)
    }

    const pod = podMap.get(booking.pod_id)
    const cluster = pod ? clusterMap.get(pod.cluster_id) : null
    const locationId = cluster?.location_id

    if (!locationId) {
      toast.warning('Cannot resolve location from selected booking (pod -> cluster -> location).')
      return
    }

    try {
      setIsStaffLoading(true)
      const response = await locationShiftApi.getWorkingStaffByLocation(locationId, {
        role: 'CLEANER',
        include_assigned: true,
        target_date: formatDateOnly(booking.end_time) || formatDateOnly(booking.start_time)
      })
      setAvailableStaff(response.data)
      if (response.data.length > 0) {
        setSelectedAssignmentId(response.data[0].assignment_id)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load available cleaner assignments')
    } finally {
      setIsStaffLoading(false)
    }
  }

  const fetchAllCleaners = async () => {
    try {
      setIsAllCleanersLoading(true)
      setAllCleanersLoadError('')
      const [upperRoleRes, lowerRoleRes] = await Promise.all([
        userApi.getAll({ role: 'CLEANER', isActive: true }),
        userApi.getAll({ role: 'cleaner', isActive: true })
      ])

      const merged = [...upperRoleRes.data, ...lowerRoleRes.data]
      const dedupedById = new Map<string, UserListItem>()

      merged.forEach((user) => {
        const id = getUserId(user)
        if (!id) return

        if (normalizeRole(user.role) !== 'cleaner') return
        dedupedById.set(id, user)
      })

      const cleaners = Array.from(dedupedById.values())
      setAllCleaners(cleaners)

      if (cleaners.length > 0) {
        setSelectedCleanerId((prev) => prev || getUserId(cleaners[0]))
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load all cleaners'
      setAllCleanersLoadError(message)
      setAllCleaners([])
      toast.warning('Cannot auto-load all cleaners. You can still paste cleaner_id manually.')
    } finally {
      setIsAllCleanersLoading(false)
    }
  }

  const handleChangeQuickCleanerSource = async (source: QuickCleanerSource) => {
    setQuickCleanerSource(source)

    if (source === 'all_cleaners' && allCleaners.length === 0) {
      await fetchAllCleaners()
    }
  }

  const handleQuickCreateTask = async () => {
    if (!selectedBooking) return

    if (selectedBookingTasks.length > 0) {
      toast.info('Selected booking already has cleaning task(s)')
      return
    }

    let cleanerId = ''
    let shiftAssignmentId: string | null = null

    if (quickCleanerSource === 'assignment') {
      const pickedAssignment = availableStaff.find((item) => item.assignment_id === selectedAssignmentId)
      if (!pickedAssignment) {
        toast.error('Please choose a cleaner assignment')
        return
      }

      cleanerId = getStaffId(pickedAssignment)
      shiftAssignmentId = pickedAssignment.assignment_id
      if (!cleanerId) {
        toast.error('Selected assignment has no valid staff id from backend response')
        return
      }
    } else {
      cleanerId = selectedCleanerId.trim()
      if (!cleanerId) {
        toast.error('Please choose a cleaner')
        return
      }
    }

    try {
      setIsQuickCreating(true)
      await cleaningTaskApi.create({
        pod_id: selectedBooking.pod_id,
        booking_id: selectedBooking.id,
        cleaner_id: cleanerId,
        shift_assignment_id: shiftAssignmentId,
        request_source: 'AUTO_AFTER_CHECKOUT',
        due_at: selectedBooking.end_time,
        status: 'ASSIGNED',
        note: quickCreateNote.trim() || null
      })
      toast.success('Cleaning task created for selected booking')
      await fetchTasks()
      await handleSelectBooking(selectedBooking)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create cleaning task from booking')
    } finally {
      setIsQuickCreating(false)
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cleaning Task Management</h1>
          <p className="text-gray-500 mt-1">Admin CRUD for cleaning task flow, booking mapping and backfill testing.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchTasks()
              fetchBookingData()
            }}
            disabled={isLoading || isBookingDataLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${(isLoading || isBookingDataLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpenCheck className="w-4 h-4 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Booking Selector</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
              placeholder="Search booking by id, pod_id, order_id, user_id..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="text-sm text-gray-600 flex items-center">Total bookings: <span className="font-semibold ml-1">{bookings.length}</span></div>
          <div className="text-sm text-gray-600 flex items-center">Filtered: <span className="font-semibold ml-1">{filteredBookings.length}</span></div>
        </div>

        <div className="border border-gray-100 rounded-lg overflow-hidden">
          {isBookingDataLoading ? (
            <div className="p-6 text-gray-500 text-center">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-6 text-gray-500 text-center">No bookings found</div>
          ) : (
            <div className="overflow-x-auto max-h-80">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Pod</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">End</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className={selectedBookingId === booking.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{booking.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{booking.pod_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{booking.order_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{booking.user_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{booking.status}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDateValue(booking.start_time)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDateValue(booking.end_time)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSelectBooking(booking)}
                          className="px-3 py-1.5 rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedBooking && (
          <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
            <h3 className="font-semibold text-indigo-900 mb-1">Selected Booking: {selectedBooking.id}</h3>
            <p className="text-sm text-indigo-800">pod_id: {selectedBooking.pod_id} | location_id: {selectedBookingLocationId || 'unknown'} | shift date: {selectedBookingDate || 'unknown'}</p>

            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Existing Cleaning Tasks</h4>
              {isSelectedBookingTasksLoading ? (
                <div className="text-sm text-gray-600">Loading tasks for selected booking...</div>
              ) : selectedBookingTasks.length === 0 ? (
                <div className="text-sm text-amber-700">No cleaning task for this booking yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-white border-b border-gray-100">
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-2">Task ID</th>
                        <th className="px-3 py-2">Cleaner</th>
                        <th className="px-3 py-2">Shift Assignment</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Due</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {selectedBookingTasks.map((task) => (
                        <tr key={task.id}>
                          <td className="px-3 py-2 text-sm text-gray-800">{task.id}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{task.cleaner_id}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{task.shift_assignment_id || '—'}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{task.status}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{formatDateValue(task.due_at)}</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => openEditModal(task)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedBookingTasks.length === 0 && (
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Create New Task For Selected Booking</h4>
                <p className="text-xs text-gray-500 mb-3">Staff list is loaded by location-shifts/locations/:locationId/working with role CLEANER and include_assigned=true.</p>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cleaner source</label>
                  <select
                    value={quickCleanerSource}
                    onChange={(e) => handleChangeQuickCleanerSource(e.target.value as QuickCleanerSource)}
                    className="w-full md:w-[360px] px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="assignment">Working assignment (by location + date)</option>
                    <option value="all_cleaners">All cleaners in system</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cleaner + Shift Assignment</label>
                    {quickCleanerSource === 'assignment' ? (
                      <select
                        value={selectedAssignmentId}
                        onChange={(e) => setSelectedAssignmentId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        disabled={isStaffLoading || availableStaff.length === 0}
                      >
                        {isStaffLoading ? (
                          <option value="">Loading staff...</option>
                        ) : availableStaff.length === 0 ? (
                          <option value="">No eligible cleaner assignment found</option>
                        ) : (
                          availableStaff.map((item) => (
                            <option key={item.assignment_id} value={item.assignment_id}>{formatStaffOption(item)}</option>
                          ))
                        )}
                      </select>
                    ) : (
                      <>
                        <select
                          value={selectedCleanerId}
                          onChange={(e) => setSelectedCleanerId(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          disabled={isAllCleanersLoading || allCleaners.length === 0}
                        >
                          {isAllCleanersLoading ? (
                            <option value="">Loading cleaners...</option>
                          ) : allCleaners.length === 0 ? (
                            <option value="">No cleaner list API available</option>
                          ) : (
                            allCleaners.map((cleaner) => {
                              const id = getUserId(cleaner)
                              return (
                                <option key={id} value={id}>{formatCleanerOption(cleaner)}</option>
                              )
                            })
                          )}
                        </select>

                        <input
                          type="text"
                          value={selectedCleanerId}
                          onChange={(e) => setSelectedCleanerId(e.target.value)}
                          placeholder="Or paste cleaner_id manually"
                          className="mt-2 w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        {allCleanersLoadError && (
                          <p className="mt-1 text-xs text-amber-700">
                            Auto-load failed: {allCleanersLoadError}. Please paste cleaner_id manually.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                    <input
                      type="text"
                      value={quickCreateNote}
                      onChange={(e) => setQuickCreateNote(e.target.value)}
                      placeholder="Optional note for this task"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  onClick={handleQuickCreateTask}
                  disabled={
                    isQuickCreating ||
                    (quickCleanerSource === 'assignment' && (isStaffLoading || availableStaff.length === 0 || !selectedAssignmentId)) ||
                    (quickCleanerSource === 'all_cleaners' && (isAllCleanersLoading || allCleaners.length === 0 || !selectedCleanerId))
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  {isQuickCreating ? 'Creating...' : 'Create Cleaning Task'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {CLEANING_TASK_STATUSES.map((status) => (
          <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <p className="text-xs text-gray-500">{status}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{statusCounts[status]}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search task by id, pod, cleaner..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All statuses</option>
            {CLEANING_TASK_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All request sources</option>
            {CLEANING_REQUEST_SOURCES.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>

          <input
            type="text"
            value={podFilter}
            onChange={(e) => setPodFilter(e.target.value)}
            placeholder="pod_id"
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <input
            type="text"
            value={cleanerFilter}
            onChange={(e) => setCleanerFilter(e.target.value)}
            placeholder="cleaner_id"
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="flex gap-2">
            <input
              type="text"
              value={bookingFilter}
              onChange={(e) => setBookingFilter(e.target.value)}
              placeholder="booking_id"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchTasks}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tasks ({filteredTasks.length})</h2>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-500">Loading cleaning tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No cleaning tasks found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Task ID</th>
                  <th className="px-4 py-3">Pod</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Cleaner</th>
                  <th className="px-4 py-3">Shift Assignment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{task.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task.pod_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task.booking_id || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task.cleaner_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task.shift_assignment_id || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task.request_source}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateValue(task.due_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateValue(task.start_time)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateValue(task.end_time)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(task)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(task)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <WandSparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Backfill Missing Tasks</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="datetime-local"
            value={backfillForm.from_date}
            onChange={(e) => setBackfillForm((prev) => ({ ...prev, from_date: e.target.value }))}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="datetime-local"
            value={backfillForm.to_date}
            onChange={(e) => setBackfillForm((prev) => ({ ...prev, to_date: e.target.value }))}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="number"
            min="1"
            value={backfillForm.limit}
            onChange={(e) => setBackfillForm((prev) => ({ ...prev, limit: e.target.value }))}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="limit"
          />
          <label className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700">
            <input
              type="checkbox"
              checked={backfillForm.dry_run}
              onChange={(e) => setBackfillForm((prev) => ({ ...prev, dry_run: e.target.checked }))}
            />
            dry_run
          </label>
          <label className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700">
            <input
              type="checkbox"
              checked={backfillForm.cleaner_access_only}
              onChange={(e) => setBackfillForm((prev) => ({ ...prev, cleaner_access_only: e.target.checked }))}
            />
            cleaner_access_only
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={runBackfill}
            disabled={isRunningBackfill}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            <WandSparkles className="w-4 h-4" />
            {isRunningBackfill ? 'Running...' : 'Run Backfill'}
          </button>

          {backfillSummary && (
            <div className="text-sm text-gray-700">
              scanned: <span className="font-semibold">{backfillSummary.scanned}</span> | created: <span className="font-semibold">{backfillSummary.created_count}</span> | skipped: <span className="font-semibold">{backfillSummary.skipped_count}</span> | failed: <span className="font-semibold">{backfillSummary.failed_count}</span>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTask ? 'Edit Cleaning Task' : 'Create Cleaning Task'}
        size="xl"
        footer={(
          <>
            <button
              onClick={closeModal}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={isSaving}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              form="cleaning-task-form"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </>
        )}
      >
        <form id="cleaning-task-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">pod_id *</label>
              <input
                type="text"
                value={form.pod_id}
                onChange={(e) => updateForm('pod_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                disabled={Boolean(editingTask)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">cleaner_id *</label>
              <select
                value={form.cleaner_id}
                onChange={(e) => updateForm('cleaner_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {!form.cleaner_id && <option value="">Select cleaner</option>}
                {allCleaners.map((cleaner) => {
                  const id = getUserId(cleaner)
                  if (!id) return null
                  return <option key={id} value={id}>{formatCleanerOption(cleaner)}</option>
                })}
                {form.cleaner_id && !allCleaners.some((cleaner) => getUserId(cleaner) === form.cleaner_id) && (
                  <option value={form.cleaner_id}>{form.cleaner_id} (current)</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">booking_id</label>
              <input
                type="text"
                value={form.booking_id}
                onChange={(e) => updateForm('booking_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                disabled={Boolean(editingTask)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">shift_assignment_id</label>
              <select
                value={form.shift_assignment_id}
                onChange={(e) => updateForm('shift_assignment_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No shift assignment</option>
                {isModalShiftLoading ? (
                  <option value="" disabled>Loading assignments...</option>
                ) : (
                  modalShiftAssignments.map((item) => (
                    <option key={item.assignment_id} value={item.assignment_id}>{formatStaffOption(item)}</option>
                  ))
                )}
                {form.shift_assignment_id && !modalShiftAssignments.some((item) => item.assignment_id === form.shift_assignment_id) && (
                  <option value={form.shift_assignment_id}>{form.shift_assignment_id} (current)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">status</label>
              <select
                value={form.status}
                onChange={(e) => updateForm('status', e.target.value as CleaningTaskStatus)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CLEANING_TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">request_source</label>
              <select
                value={form.request_source}
                onChange={(e) => updateForm('request_source', e.target.value as CleaningRequestSource)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CLEANING_REQUEST_SOURCES.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">due_at</label>
              <input
                type="datetime-local"
                value={form.due_at}
                onChange={(e) => updateForm('due_at', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">assigned_at</label>
              <input
                type="datetime-local"
                value={form.assigned_at}
                onChange={(e) => updateForm('assigned_at', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">notified_at</label>
              <input
                type="datetime-local"
                value={form.notified_at}
                onChange={(e) => updateForm('notified_at', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">accepted_at</label>
              <input
                type="datetime-local"
                value={form.accepted_at}
                onChange={(e) => updateForm('accepted_at', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">start_time</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => updateForm('start_time', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">end_time</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => updateForm('end_time', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">reassigned_from_cleaner_id</label>
              <select
                value={form.reassigned_from_cleaner_id}
                onChange={(e) => updateForm('reassigned_from_cleaner_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">None</option>
                {allCleaners.map((cleaner) => {
                  const id = getUserId(cleaner)
                  if (!id) return null
                  return <option key={id} value={id}>{formatCleanerOption(cleaner)}</option>
                })}
                {form.reassigned_from_cleaner_id && !allCleaners.some((cleaner) => getUserId(cleaner) === form.reassigned_from_cleaner_id) && (
                  <option value={form.reassigned_from_cleaner_id}>{form.reassigned_from_cleaner_id} (current)</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">note</label>
            <textarea
              value={form.note}
              onChange={(e) => updateForm('note', e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">rejection_reason</label>
            <textarea
              value={form.rejection_reason}
              onChange={(e) => updateForm('rejection_reason', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
