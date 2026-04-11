import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowRightLeft, ArrowUp, Check, Eye, RefreshCw, Search, SlidersHorizontal, Clock, X, AlertCircle } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  supportRequestApi,
  SUPPORT_MAINTENANCE_SEVERITIES,
  SUPPORT_REQUEST_STATUSES,
  type RoomChangeCandidatePod,
  type SupportMaintenanceSeverity,
  type SupportRequestItem,
  type SupportRequestStatus,
  type RoomChangeResultPayload
} from '../../api/lib/supportRequestApi'
import { bookingApi, type BookingItem } from '../../api/lib/bookingApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { PodGridSelector } from '../../components/common/PodGridSelector'

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN')
}

const compactId = (value?: string | null) => {
  if (!value) return '—'
  if (value.length <= 16) return value
  return `${value.slice(0, 8)}...${value.slice(-6)}`
}

const supportStatusClass = (status: SupportRequestStatus) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'PROCESSING':
      return 'bg-sky-50 text-sky-700 border border-sky-200'
    case 'IN_PROGRESS':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'ESCALATED':
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'REJECTED':
      return 'bg-gray-100 text-gray-700 border border-gray-200'
    case 'CANCELED':
      return 'bg-gray-100 text-gray-400 border border-gray-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

const supportStatusDotClass = (status: SupportRequestStatus) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-500'
    case 'PROCESSING':
      return 'bg-sky-500'
    case 'IN_PROGRESS':
      return 'bg-blue-600'
    case 'ESCALATED':
      return 'bg-rose-500'
    case 'RESOLVED':
      return 'bg-emerald-500'
    case 'REJECTED':
    case 'CANCELED':
      return 'bg-gray-400'
    default:
      return 'bg-slate-400'
  }
}

const normalizedType = (value?: string | null) => (value || '').trim().toUpperCase()
const isChangePodRequest = (value?: string | null) => normalizedType(value) === 'CHANGE_POD'
const isMaintenanceRequest = (value?: string | null) => normalizedType(value) === 'MAINTENANCE'
const getBookingIdFromRequest = (item: SupportRequestItem) => item.booking_id || item.booking?.id || ''
const PROCESSING_STATUS: SupportRequestStatus = 'PROCESSING'

type StatusTransitionModalState = {
  isOpen: boolean
  request: SupportRequestItem | null
  targetStatus: 'ESCALATED' | 'RESOLVED' | 'REJECTED'
  resolutionNote: string
  escalationNote: string
  severity: SupportMaintenanceSeverity
}

const normalizeSeverity = (value?: string | null): SupportMaintenanceSeverity => {
  const normalized = (value || '').trim().toUpperCase()
  if (normalized === 'LOW' || normalized === 'MEDIUM' || normalized === 'HIGH' || normalized === 'CRITICAL') {
    return normalized
  }
  return 'MEDIUM'
}

const normalizeStatus = (status?: string | null): SupportRequestStatus => {
  const normalized = String(status || '').trim().toUpperCase()
  if (normalized === 'IN_PROGRESS') return 'IN_PROGRESS'
  if (normalized === 'PENDING') return 'PENDING'
  if (normalized === 'PROCESSING') return 'PROCESSING'
  if (normalized === 'ESCALATED') return 'ESCALATED'
  if (normalized === 'RESOLVED') return 'RESOLVED'
  if (normalized === 'REJECTED') return 'REJECTED'
  if (normalized === 'CANCELED') return 'CANCELED'
  return 'PENDING'
}

const getCandidatePodId = (pod: RoomChangeCandidatePod) => pod.pod_id || pod.id || ''
const getCandidatePodCode = (pod: RoomChangeCandidatePod) => pod.pod_code || pod.code || ''
const getCandidatePodName = (pod: RoomChangeCandidatePod) => pod.pod_name || pod.name || ''
const getCreatedTimestamp = (item: SupportRequestItem) => item.created_at || (item as any).createdAt || null

type SupportSortKey = 'created_at' | 'type' | 'user' | 'pod' | 'status'
type SupportSortDirection = 'asc' | 'desc'

type SupportFilterState = {
  statuses: SupportRequestStatus[]
  types: string[]
  dateRange: [Date | null, Date | null]
}

const getTierValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const normalized = String(value || '').trim().toUpperCase()
  if (!normalized) return null
  const map: Record<string, number> = {
    BASIC: 1,
    STANDARD: 2,
    PREMIUM: 3,
    VIP: 4
  }
  return map[normalized] ?? null
}

const hasTimeConflictWarning = (candidate: RoomChangeCandidatePod): boolean => {
  const raw = candidate as any
  if (raw.has_time_conflict === true) return true
  if (raw.time_conflict === true) return true
  if (raw.conflict === true) return true
  return false
}

const areRelatedTasksDone = (request: SupportRequestItem): boolean => {
  const relatedTasks = (request as any)?.related_tasks
  if (!Array.isArray(relatedTasks) || relatedTasks.length === 0) return true
  return relatedTasks.every((task: any) => {
    const status = String(task?.status || task || '').trim().toUpperCase()
    return status === 'DONE' || status === 'COMPLETED' || status === 'RESOLVED' || status === 'CLOSED'
  })
}

export const SupportManagement = () => {
  const { clusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()

  const [pods, setPods] = useState<PodItem[]>([])
  const [isPodsLoading, setIsPodsLoading] = useState(false)

  const [supportRequests, setSupportRequests] = useState<SupportRequestItem[]>([])
  const [isSupportLoading, setIsSupportLoading] = useState(true)
  const [supportSearch, setSupportSearch] = useState('')
  const [updatingSupportId, setUpdatingSupportId] = useState<string | null>(null)

  const [detailRequestId, setDetailRequestId] = useState<string | null>(null)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [filters, setFilters] = useState<SupportFilterState>({ statuses: [], types: [], dateRange: [null, null] })
  const [draftFilters, setDraftFilters] = useState<SupportFilterState>({ statuses: [], types: [], dateRange: [null, null] })
  const [sortKey, setSortKey] = useState<SupportSortKey>('created_at')
  const [sortDirection, setSortDirection] = useState<SupportSortDirection>('desc')
  const [selectedNewPodByRequest, setSelectedNewPodByRequest] = useState<Record<string, string>>({})
  const [isChangingPodRequestId, setIsChangingPodRequestId] = useState<string | null>(null)
  const [roomChangeCandidatesByRequest, setRoomChangeCandidatesByRequest] = useState<Record<string, RoomChangeCandidatePod[]>>({})
  const [loadingRoomChangeRequestId, setLoadingRoomChangeRequestId] = useState<string | null>(null)
  const [selectedSeverityByRequest, setSelectedSeverityByRequest] = useState<Record<string, SupportMaintenanceSeverity>>({})
  const [roomChangeResolutionByRequest, setRoomChangeResolutionByRequest] = useState<Record<string, string>>({})
  const [roomChangeResult, setRoomChangeResult] = useState<RoomChangeResultPayload | null>(null)
  const [statusModal, setStatusModal] = useState<StatusTransitionModalState>({
    isOpen: false,
    request: null,
    targetStatus: 'RESOLVED',
    resolutionNote: '',
    escalationNote: '',
    severity: 'MEDIUM'
  })
  const [bookingDetailsById, setBookingDetailsById] = useState<Record<string, BookingItem>>({})
  const [loadingBookingId, setLoadingBookingId] = useState<string | null>(null)

  const podMap = useMemo(() => new Map(pods.map((pod) => [pod.id, pod])), [pods])

  const supportStats = useMemo(
    () => supportRequests.reduce<Record<string, number>>((acc, item) => {
      const status = normalizeStatus(item.status)
      acc[status] = (acc[status] ?? 0) + 1
      return acc
    }, {}),
    [supportRequests]
  )

  const statusSummary = useMemo(
    () =>
      SUPPORT_REQUEST_STATUSES.map((status) => {
        const count = supportStats[status] ?? 0
        const percent = supportRequests.length > 0 ? (count / supportRequests.length) * 100 : 0
        return { status, count, percent }
      }),
    [supportStats, supportRequests.length]
  )

  const visibleSupportRequests = useMemo(() => {
    const normalizedSearch = supportSearch.trim().toLowerCase()
    const [fromDate, toDate] = filters.dateRange

    const filtered = supportRequests.filter((item) => {
      const currentStatus = normalizeStatus(item.status)
      if (filters.statuses.length > 0 && !filters.statuses.includes(currentStatus)) return false

      if (filters.types.length > 0) {
        const normalizedTypeValue = normalizedType(item.type)
        if (!filters.types.some(t => normalizedType(t) === normalizedTypeValue)) return false
      }

      if (fromDate || toDate) {
        const createdRaw = getCreatedTimestamp(item)
        const createdDate = createdRaw ? new Date(createdRaw) : null
        if (!createdDate || Number.isNaN(createdDate.getTime())) return false

        if (fromDate) {
          const from = new Date(fromDate)
          from.setHours(0, 0, 0, 0)
          if (createdDate < from) return false
        }
        if (toDate) {
          const to = new Date(toDate)
          to.setHours(23, 59, 59, 999)
          if (createdDate > to) return false
        }
      }

      if (!normalizedSearch) return true
      const pod = item.pod_id ? podMap.get(item.pod_id) : undefined
      return [
        item.id,
        item.type,
        item.description,
        item.user?.full_name,
        item.user?.email,
        item.booking_id,
        item.pod?.code,
        pod?.code,
        item.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })

    const compareText = (a?: string | null, b?: string | null) =>
      String(a || '').localeCompare(String(b || ''), 'vi', { sensitivity: 'base' })

    const compareDates = (a?: string | null, b?: string | null) => {
      const da = a ? new Date(a).getTime() : 0
      const db = b ? new Date(b).getTime() : 0
      return da - db
    }

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      if (sortKey === 'created_at') {
        return dir * compareDates(getCreatedTimestamp(a), getCreatedTimestamp(b))
      }
      if (sortKey === 'type') {
        return dir * compareText(a.type, b.type)
      }
      if (sortKey === 'user') {
        const au = a.user?.full_name || a.user?.email || a.user_id
        const bu = b.user?.full_name || b.user?.email || b.user_id
        return dir * compareText(au, bu)
      }
      if (sortKey === 'pod') {
        const ap = a.pod?.code || (a.pod_id ? podMap.get(a.pod_id)?.code : '') || ''
        const bp = b.pod?.code || (b.pod_id ? podMap.get(b.pod_id)?.code : '') || ''
        return dir * compareText(ap, bp)
      }
      if (sortKey === 'status') {
        return dir * compareText(normalizeStatus(a.status), normalizeStatus(b.status))
      }
      return 0
    })

    return sorted
  }, [supportRequests, supportSearch, podMap, filters, sortKey, sortDirection])

  const requestTypes = useMemo(() => {
    const set = new Set<string>()
    supportRequests.forEach((item) => {
      const t = String(item.type || '').trim()
      if (t) set.add(t)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }))
  }, [supportRequests])

  const detailRequest = useMemo(
    () => supportRequests.find((item) => item.id === detailRequestId) || null,
    [supportRequests, detailRequestId]
  )

  const fetchPods = async () => {
    try {
      setIsPodsLoading(true)
      const response = await podApi.getAll()
      setPods(response.data)
    } catch (error) {
      console.error(error)
      setPods([])
      toast.error('Lỗi: Không tải được danh sách phòng')
    } finally {
      setIsPodsLoading(false)
    }
  }

  const fetchSupportRequests = async () => {
    try {
      setIsSupportLoading(true)
      const response = await supportRequestApi.getAll({
        status: filters.statuses.length === 1 ? filters.statuses[0] : undefined,
        limit: 200
      })
      setSupportRequests(response.supportRequests)
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Lỗi: Không thể tải danh sách yêu cầu hỗ trợ')
      setSupportRequests([])
    } finally {
      setIsSupportLoading(false)
    }
  }

  useEffect(() => {
    if (isScopeLoading) return
    fetchPods()
  }, [isScopeLoading, clusters])

  useEffect(() => {
    if (isScopeLoading) return
    fetchSupportRequests()
  }, [isScopeLoading, JSON.stringify(filters.statuses), clusters])

  useEffect(() => {
    if (!detailRequestId) return
    const exists = visibleSupportRequests.some((item) => item.id === detailRequestId)
    if (!exists) {
      setDetailRequestId(null)
    }
  }, [visibleSupportRequests, detailRequestId])

  useEffect(() => {
    const isAnyPanelOpen = isFilterPanelOpen || Boolean(detailRequest)
    if (!isAnyPanelOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isFilterPanelOpen, detailRequest])

  useEffect(() => {
    if (!detailRequest) return
    const supportsRoomChange = isChangePodRequest(detailRequest.type) || isMaintenanceRequest(detailRequest.type)
    if (!supportsRoomChange) return

    const bookingId = getBookingIdFromRequest(detailRequest)
    if (!bookingId || bookingDetailsById[bookingId]) return

    const loadBooking = async () => {
      try {
        setLoadingBookingId(bookingId)
        const booking = await bookingApi.getById(bookingId)
        setBookingDetailsById((prev) => ({ ...prev, [bookingId]: booking }))
      } catch (error: unknown) {
        const apiError = error as { response?: { data?: { message?: string } } }
        toast.error(apiError?.response?.data?.message || 'Lỗi: Không tải được chi tiết đơn đặt phòng')
      } finally {
        setLoadingBookingId(null)
      }
    }

    loadBooking()
  }, [detailRequest, bookingDetailsById])

  useEffect(() => {
    if (!detailRequest) return
    const currentSeverity = selectedSeverityByRequest[detailRequest.id] || normalizeSeverity(detailRequest.severity)
    const supportsRoomChange = isChangePodRequest(detailRequest.type) || (isMaintenanceRequest(detailRequest.type) && (currentSeverity === 'HIGH' || currentSeverity === 'CRITICAL'))
    if (!supportsRoomChange) return

    // Do not fetch pod candidates for finished requests to prevent API errors
    const currentStatus = normalizeStatus(detailRequest.status)
    if (!['PROCESSING', 'IN_PROGRESS', 'ESCALATED'].includes(currentStatus)) return

    if (roomChangeCandidatesByRequest[detailRequest.id]) return

    const loadCandidates = async () => {
      try {
        setLoadingRoomChangeRequestId(detailRequest.id)
        const result = await supportRequestApi.getRoomChangeCandidates(detailRequest.id)
        setRoomChangeCandidatesByRequest((prev) => ({ ...prev, [detailRequest.id]: result.candidates }))
      } catch (error: unknown) {
        const apiError = error as { response?: { data?: { message?: string } } }
        const errorMessage = apiError?.response?.data?.message || 'Lỗi: Không tải được danh sách phòng thay thế'
        if (!errorMessage.includes('Room change is only allowed when booking is IN_USE')) {
          toast.error(errorMessage)
        }
      } finally {
        setLoadingRoomChangeRequestId(null)
      }
    }

    loadCandidates()
  }, [detailRequest, roomChangeCandidatesByRequest, selectedSeverityByRequest])

  const handleRefresh = async () => {
    try {
      await refreshScope()
      await Promise.all([fetchPods(), fetchSupportRequests()])
      toast.success('Đã tải lại dữ liệu phiên làm việc')
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Lỗi: Không làm mới được dữ liệu hỗ trợ')
    }
  }

  const handleUpdateSupportStatus = async (
    id: string,
    payload: {
      status: SupportRequestStatus
      severity?: SupportMaintenanceSeverity
      escalation_note?: string
      resolution_note?: string
    }
  ) => {
    try {
      setUpdatingSupportId(id)
      const updated = await supportRequestApi.updateStatus(id, payload)
      setSupportRequests((prev) => prev.map((item) => (item.id === id ? updated : item)))
      toast.success('Đã cập nhật trạng thái yêu cầu hỗ trợ')
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Lỗi: Không thể cập nhật trạng thái')
    } finally {
      setUpdatingSupportId(null)
    }
  }

  const openDetailModal = (request: SupportRequestItem) => {
    setDetailRequestId(request.id)

    if (!selectedNewPodByRequest[request.id]) {
      setSelectedNewPodByRequest((prev) => ({ ...prev, [request.id]: '' }))
    }

    if (!selectedSeverityByRequest[request.id]) {
      setSelectedSeverityByRequest((prev) => ({ ...prev, [request.id]: normalizeSeverity(request.severity) }))
    }
  }

  const closeDetailModal = () => {
    setDetailRequestId(null)
  }

  const toggleSort = (key: SupportSortKey) => {
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDirection(key === 'created_at' ? 'desc' : 'asc')
        return key
      }
      setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'))
      return prevKey
    })
  }

  const openFilterPanel = () => {
    setDraftFilters(filters)
    setIsFilterPanelOpen(true)
  }

  const applyFilters = () => {
    setFilters(draftFilters)
    setIsFilterPanelOpen(false)
  }

  const resetDraftFilters = () => {
    setDraftFilters({ statuses: [], types: [], dateRange: [null, null] })
  }

  const setStatusWithFallback = async (id: string, nextStatus: SupportRequestStatus) => {
    try {
      const updated = await supportRequestApi.updateStatus(id, { status: nextStatus })
      setSupportRequests((prev) => prev.map((item) => (item.id === id ? updated : item)))
      return updated
    } catch (error: unknown) {
      const statusCode = (error as { response?: { status?: number } })?.response?.status
      if (nextStatus === 'PROCESSING' && (statusCode === 400 || statusCode === 422)) {
        const fallback = await supportRequestApi.updateStatus(id, { status: 'IN_PROGRESS' })
        setSupportRequests((prev) => prev.map((item) => (item.id === id ? fallback : item)))
        return fallback
      }
      throw error
    }
  }

  const getAllowedTransitions = (request: SupportRequestItem): SupportRequestStatus[] => {
    const current = normalizeStatus(request.status)
    const transitionMap: Record<string, SupportRequestStatus[]> = {
      PENDING: ['PROCESSING', 'REJECTED'],
      PROCESSING: ['IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'REJECTED'],
      IN_PROGRESS: ['ESCALATED', 'RESOLVED', 'REJECTED'],
      ESCALATED: ['RESOLVED', 'REJECTED'],
      RESOLVED: [],
      REJECTED: []
    }
    return transitionMap[current] || []
  }

  const openStatusTransitionModal = (request: SupportRequestItem, targetStatus: 'ESCALATED' | 'RESOLVED' | 'REJECTED') => {
    setStatusModal({
      isOpen: true,
      request,
      targetStatus,
      resolutionNote: '',
      escalationNote: '',
      severity: selectedSeverityByRequest[request.id] || normalizeSeverity(request.severity)
    })
  }

  const closeStatusTransitionModal = () => {
    setStatusModal((prev) => ({ ...prev, isOpen: false, request: null }))
  }

  const confirmStatusTransition = async () => {
    const request = statusModal.request
    if (!request) return
    setSelectedSeverityByRequest((prev) => ({ ...prev, [request.id]: statusModal.severity }))
    const isMaintenance = isMaintenanceRequest(request.type)

    const targetStatus = statusModal.targetStatus
    if (targetStatus === 'ESCALATED') {
      const severity = statusModal.severity
      if (!isMaintenance) {
        toast.error('Chỉ yêu cầu BẢO TRÌ mới có thể thao tác Quá hạn/Chuyển cấp.')
        return
      }
      if (severity !== 'HIGH' && severity !== 'CRITICAL') {
        toast.error('Chuyển cấp quản trị yêu cầu mức độ sự cố CAO hoặc NGHIÊM TRỌNG.')
        return
      }
      if (!statusModal.escalationNote.trim()) {
        toast.error('Vui lòng nhập lý do/ghi chú chuyển cấp (Escalation note).')
        return
      }

      await handleUpdateSupportStatus(request.id, {
        status: 'ESCALATED',
        ...(isMaintenance ? { severity } : {}),
        escalation_note: statusModal.escalationNote.trim()
      })
      closeStatusTransitionModal()
      return
    }

    if (!statusModal.resolutionNote.trim()) {
      toast.error('Vui lòng nhập ghi chú hướng giải quyết (Resolution note).')
      return
    }

    if (targetStatus === 'REJECTED' && statusModal.resolutionNote.trim().length <= 10) {
      toast.error('Lý do từ chối phải dài hơn 10 ký tự.')
      return
    }

    await handleUpdateSupportStatus(request.id, {
      status: targetStatus,
      ...(isMaintenance ? { severity: statusModal.severity } : {}),
      resolution_note: statusModal.resolutionNote.trim()
    })
    closeStatusTransitionModal()
  }

  const handleStartMaintenanceProcessing = async (request: SupportRequestItem) => {
    try {
      setUpdatingSupportId(request.id)
      await setStatusWithFallback(request.id, PROCESSING_STATUS)
      toast.success('Đã tiếp nhận yêu cầu. Cập nhật trạng thái thành ĐANG XỬ LÝ chờ điều phối.')
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Lỗi: Không thể nhận xử lý phiếu này.')
    } finally {
      setUpdatingSupportId(null)
    }
  }

  const handleStartWork = async (request: SupportRequestItem) => {
    try {
      setUpdatingSupportId(request.id)
      const updated = await supportRequestApi.updateStatus(request.id, { status: 'IN_PROGRESS' })
      setSupportRequests((prev) => prev.map((item) => (item.id === request.id ? updated : item)))
      const serverStatus = normalizeStatus(updated.status)
      if (serverStatus === 'PROCESSING') {
        toast.info('Ghi nhận hệ thống hiển thị: ĐANG CHỜ GIẢI QUYẾT do config riêng.')
      } else {
        toast.success(`Đã nhận việc! Cập nhật trạng thái thành: ${serverStatus}.`)
      }
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Lỗi: Không thể triển khai công việc.')
    } finally {
      setUpdatingSupportId(null)
    }
  }

  const handleEscalateMaintenance = async (request: SupportRequestItem) => {
    const severity = selectedSeverityByRequest[request.id] || normalizeSeverity(request.severity)
    if (severity !== 'HIGH' && severity !== 'CRITICAL') {
      toast.error('Chỉ hỗ trợ chuyển cấp nếu độ ưu tiên đạt CAO hoặc NGHIÊM TRỌNG.')
      return
    }

    openStatusTransitionModal(request, 'ESCALATED')
  }

  const handleChangePodFromRequest = async (request: SupportRequestItem) => {
    const selectedNewPodId = selectedNewPodByRequest[request.id]
    if (!selectedNewPodId) {
      toast.error('Vui lòng chọn phòng / Vị trí thay thế mới!')
      return
    }

    const resolutionNote = (roomChangeResolutionByRequest[request.id] || '').trim()
    const maintenanceMode = isMaintenanceRequest(request.type)
    const oldPodNextStatus = maintenanceMode ? 'MAINTENANCE' : 'NEEDS_CLEANING'

    try {
      setIsChangingPodRequestId(request.id)
      const result = await supportRequestApi.executeRoomChange(request.id, {
        target_pod_id: selectedNewPodId,
        old_pod_next_status: oldPodNextStatus,
        old_pod_reason: maintenanceMode ? (request.description || undefined) : undefined,
        resolution_note: resolutionNote || undefined,
        ...(maintenanceMode ? { severity: selectedSeverityByRequest[request.id] || normalizeSeverity(request.severity) } : {})
      })
      setSelectedNewPodByRequest((prev) => ({ ...prev, [request.id]: '' }))
      setRoomChangeResolutionByRequest((prev) => ({ ...prev, [request.id]: '' }))
      toast.success('Đã cấu hình đổi phòng khẩn cấp thành công!')
      setRoomChangeResult(result)
      await Promise.all([fetchSupportRequests(), fetchPods()])
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Failed to change room.')
    } finally {
      setIsChangingPodRequestId(null)
    }
  }

  const detailCurrentStatus = detailRequest ? normalizeStatus(detailRequest.status) : null
  const detailBookingId = detailRequest ? getBookingIdFromRequest(detailRequest) : ''
  const detailBooking = detailBookingId ? bookingDetailsById[detailBookingId] : undefined
  const detailCurrentPodId = detailBooking?.pod_id || detailRequest?.pod_id || detailRequest?.booking?.pod_id || detailRequest?.pod?.id || ''
  const detailCurrentPod = detailCurrentPodId ? podMap.get(detailCurrentPodId) : undefined
  const detailSeverity = detailRequest ? (selectedSeverityByRequest[detailRequest.id] || normalizeSeverity(detailRequest.severity)) : 'MEDIUM'

  // Only show Room Change UI if it's ACCEPTED (PROCESSING or IN_PROGRESS or ESCALATED)
  const detailSupportsRoomChange = detailRequest
    ? ((isChangePodRequest(detailRequest.type) || (isMaintenanceRequest(detailRequest.type) && (detailSeverity === 'HIGH' || detailSeverity === 'CRITICAL'))) &&
      ['PROCESSING', 'IN_PROGRESS', 'ESCALATED'].includes(detailCurrentStatus || ''))
    : false
  const detailCanAccept = detailCurrentStatus === 'PENDING'
  const detailCanStartWork = detailCurrentStatus === 'PROCESSING'
  const detailCanResolve = detailCurrentStatus === 'PROCESSING' || detailCurrentStatus === 'IN_PROGRESS' || detailCurrentStatus === 'ESCALATED'
  const detailCanReject = detailRequest ? getAllowedTransitions(detailRequest).includes('REJECTED') : false
  const detailCanEscalate = detailRequest
    ? isMaintenanceRequest(detailRequest.type) && getAllowedTransitions(detailRequest).includes('ESCALATED') && (detailSeverity === 'HIGH' || detailSeverity === 'CRITICAL')
    : false
  const detailCanResolveByTasks = detailRequest ? areRelatedTasksDone(detailRequest) : false

  const rawCandidates = detailRequest ? (roomChangeCandidatesByRequest[detailRequest.id] ?? []) : []
  const filteredCandidates = rawCandidates.filter((candidate) => {
    const status = String(candidate.status || 'AVAILABLE').trim().toUpperCase()
    if (status !== 'AVAILABLE') return false
    const scopeLevel = String((candidate as any).scope_level || '').trim().toUpperCase()
    if (scopeLevel && scopeLevel !== 'SAME_CLUSTER' && scopeLevel !== 'SAME_PARENT_LOCATION') return false
    return true
  }).map(candidate => ({
    ...candidate,
    status: candidate.status || 'AVAILABLE'
  }))

  const candidatesForGrid = filteredCandidates.map(c => ({
    id: getCandidatePodId(c),
    code: getCandidatePodCode(c),
    name: getCandidatePodName(c),
    status: c.status
  }))

  const selectedCandidatePodId = detailRequest ? (selectedNewPodByRequest[detailRequest.id] || '') : ''
  const selectedCandidate = filteredCandidates.find((candidate) => getCandidatePodId(candidate) === selectedCandidatePodId)
  const currentTierValue = getTierValue((detailCurrentPod as any)?.pod_type ?? (detailCurrentPod as any)?.tier)
  const selectedTierValue = getTierValue((selectedCandidate as any)?.pod_type ?? (selectedCandidate as any)?.tier)
  const showTierWarning =
    currentTierValue != null && selectedTierValue != null && selectedTierValue < currentTierValue

  const detailBookingStatus = String(detailBooking?.status || detailRequest?.booking?.status || '').toUpperCase()
  const detailCanExecuteRoomChange = detailBookingStatus === 'IN_USE'
  const isCompletedReq = ['RESOLVED', 'REJECTED', 'CANCELED'].includes(detailCurrentStatus || '')
  const shouldHideManagerActions = detailBookingStatus === 'COMPLETED' && !isCompletedReq

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Support Requests</h1>
          <p className="text-gray-500 mt-1">Manage and process customer support requests in your scope.</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isScopeLoading || isPodsLoading || isSupportLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${(isScopeLoading || isPodsLoading || isSupportLoading) ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-5 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-[220px] pr-4 xl:border-r xl:border-gray-200">
              <p className="text-xs uppercase font-semibold tracking-wide text-gray-500">Total requests</p>
              <p className="text-[34px] leading-tight font-bold text-gray-900 mt-1">{supportRequests.length}</p>
            </div>

            <div className="min-w-[650px] flex-1 py-1">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{supportRequests.length} tickets</p>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-1.5">
                {statusSummary.map((item) => (
                  <div
                    key={item.status}
                    className={supportStatusDotClass(item.status)}
                    style={{ width: `${item.percent}%` }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {statusSummary.filter((item) => item.count > 0).map((item) => (
                  <span key={item.status} className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <span className={`w-2 h-2 rounded-full ${supportStatusDotClass(item.status)}`} />
                    {item.status}: {item.count}
                  </span>
                ))}
              </div>
            </div>

          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={supportSearch}
                onChange={(event) => setSupportSearch(event.target.value)}
                placeholder="Search request, user, booking..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            <button
              type="button"
              onClick={openFilterPanel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-gray-500">
                  <button type="button" onClick={() => toggleSort('type')} className="inline-flex items-center gap-2 hover:text-gray-700">
                    Request
                    {sortKey === 'type' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">
                  <button type="button" onClick={() => toggleSort('user')} className="inline-flex items-center gap-2 hover:text-gray-700">
                    User
                    {sortKey === 'user' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">
                  <button type="button" onClick={() => toggleSort('pod')} className="inline-flex items-center gap-2 hover:text-gray-700">
                    Pod
                    {sortKey === 'pod' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">
                  <button type="button" onClick={() => toggleSort('created_at')} className="inline-flex items-center gap-2 hover:text-gray-700">
                    Created
                    {sortKey === 'created_at' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">
                  <button type="button" onClick={() => toggleSort('status')} className="inline-flex items-center gap-2 hover:text-gray-700">
                    Status
                    {sortKey === 'status' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {!isSupportLoading && visibleSupportRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No support requests found</td>
                </tr>
              )}
              {visibleSupportRequests.map((item) => {
                const pod = item.pod_id ? podMap.get(item.pod_id) : undefined
                const currentStatus = normalizeStatus(item.status)

                return (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 align-top">
                      <p className="font-medium text-gray-900">{item.type || 'Support request'}</p>
                      {item.description && (
                        <p className="text-xs text-gray-600 mt-1 max-w-md line-clamp-2">{item.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-700">
                      <p>{item.user?.full_name || item.user?.email || compactId(item.user_id)}</p>
                    </td>
                    <td className="px-6 py-4 align-top text-gray-700">
                      <p>{item.pod?.code || pod?.code || '—'}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.pod?.name || pod?.name || '—'}</p>
                    </td>
                    <td className="px-6 py-4 align-top text-gray-700">{formatDateTime(getCreatedTimestamp(item))}</td>
                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${supportStatusClass(currentStatus)}`}>
                        {currentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      {currentStatus === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => handleStartMaintenanceProcessing(item)}
                          disabled={updatingSupportId === item.id}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          Receive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openDetailModal(item)}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" />
                          View Detail
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter panel (slide-in from right) */}
      <div className={`fixed inset-0 z-50 ${isFilterPanelOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isFilterPanelOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isFilterPanelOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsFilterPanelOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-hidden bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl ${isFilterPanelOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <p className="text-xs text-gray-500 mt-1">Filter by status, type, and date range.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">Status</label>
                  <span className="text-xs text-gray-500 whitespace-nowrap">Selected {draftFilters.statuses.length || 'All'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftFilters(prev => ({ ...prev, statuses: [] }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.statuses.length === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {draftFilters.statuses.length === 0 && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                    All
                  </button>
                  {SUPPORT_REQUEST_STATUSES.map(status => {
                    const isSelected = draftFilters.statuses.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setDraftFilters(prev => {
                            if (isSelected) {
                              return { ...prev, statuses: prev.statuses.filter(s => s !== status) }
                            }
                            const nextStatuses = [...prev.statuses, status]
                            if (nextStatuses.length === SUPPORT_REQUEST_STATUSES.length) {
                              return { ...prev, statuses: [] }
                            }
                            return { ...prev, statuses: nextStatuses }
                          })
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        {isSelected && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                        {status}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">Type request</label>
                  <span className="text-xs text-gray-500 whitespace-nowrap">Selected {draftFilters.types.length || 'All'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftFilters(prev => ({ ...prev, types: [] }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.types.length === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {draftFilters.types.length === 0 && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                    All
                  </button>
                  {requestTypes.map(type => {
                    const isSelected = draftFilters.types.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setDraftFilters(prev => {
                            if (isSelected) {
                              return { ...prev, types: prev.types.filter(t => t !== type) }
                            }
                            const nextTypes = [...prev.types, type]
                            if (nextTypes.length === requestTypes.length) {
                              return { ...prev, types: [] }
                            }
                            return { ...prev, types: nextTypes }
                          })
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        {isSelected && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                        {type}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <style>{`
                  .custom-calendar .react-datepicker { border: none; font-family: inherit; width: 100%; display: flex; flex-direction: column; }
                  .custom-calendar .react-datepicker__month-container { width: 100%; display: flex; flex-direction: column; }
                  .custom-calendar .react-datepicker__header { background: white; border-bottom: none; padding-top: 16px; width: 100%; }
                  .custom-calendar .react-datepicker__current-month { font-weight: 500; font-size: 16px; color: #111827; margin-bottom: 12px; }
                  .custom-calendar .react-datepicker__day-names { display: flex; justify-content: center; gap: 20px; margin-bottom: 8px; }
                  .custom-calendar .react-datepicker__week { display: flex; justify-content: center; gap: 25px; margin-bottom: 4px; }
                  .custom-calendar .react-datepicker__day-name { color: #6b7280; font-weight: 500; font-size: 13px; flex: 1; display: flex; align-items: center; justify-content: center; width: auto; max-width: 48px; }
                  .custom-calendar .react-datepicker__day { font-weight: 400; font-size: 14px; color: #374151; border-radius: 9999px; outline: none; margin: 0; flex: 1; display: flex; align-items: center; justify-content: center; aspect-ratio: 1/1; max-width: 48px; max-height: 48px; width: auto; }
                  .custom-calendar .react-datepicker__day:hover { background-color: #f3f4f6; border-radius: 9999px; }
                  .custom-calendar .react-datepicker__day--in-range, .custom-calendar .react-datepicker__day--in-selecting-range { background-color: #f3f4f6; color: #111827; border-radius: 0; }
                  .custom-calendar .react-datepicker__day--range-start,
                  .custom-calendar .react-datepicker__day--range-end,
                  .custom-calendar .react-datepicker__day--selecting-range-start,
                  .custom-calendar .react-datepicker__day--selecting-range-end { background-color: #111827 !important; color: #fff !important; border-radius: 9999px !important; font-weight: 500; }
                  .custom-calendar .react-datepicker__navigation { top: 16px; }
                  .custom-calendar .react-datepicker__navigation-icon::before { border-color: #6b7280; border-width: 2px 2px 0 0; height: 8px; width: 8px; top: 1px; }
                `}</style>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">Date Range</label>
                </div>
                <div className="border border-gray-200 rounded-xl shadow-sm bg-white custom-calendar w-full overflow-hidden">
                  <div className="w-full p-4">
                    <DatePicker
                      selected={draftFilters.dateRange[0]}
                      onChange={(update: [Date | null, Date | null]) => setDraftFilters(prev => ({ ...prev, dateRange: update }))}
                      startDate={draftFilters.dateRange[0] || undefined}
                      endDate={draftFilters.dateRange[1] || undefined}
                      selectsRange
                      inline
                      monthsShown={1}
                    />
                  </div>
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                    <button
                      type="button"
                      onClick={() => setDraftFilters(prev => ({ ...prev, dateRange: [null, null] }))}
                      className="text-sm font-semibold text-gray-900 underline hover:text-gray-700 transition"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={applyFilters}
                      className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 bg-white flex items-center justify-between gap-3 lg:rounded-b-xl">
              <button
                type="button"
                onClick={resetDraftFilters}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel (slide-in from right) */}
      <div className={`fixed inset-0 z-50 ${detailRequest ? '' : 'pointer-events-none'}`} aria-hidden={!detailRequest}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${detailRequest ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeDetailModal}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-[960px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl ${detailRequest ? 'translate-x-0' : 'translate-x-[110%]'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Request detail</h2>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {detailRequest && (
                <div className="space-y-6">

                  <div className="flex flex-col text-sm">
                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                      <span className="text-gray-500">Status</span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${detailCurrentStatus ? supportStatusClass(detailCurrentStatus as SupportRequestStatus) : ''}`}>
                        {detailCurrentStatus}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium text-gray-900">{detailRequest.type || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                      <span className="text-gray-500">Created</span>
                      <span className="font-medium text-gray-900">{formatDateTime(getCreatedTimestamp(detailRequest))}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-gray-100 gap-4">
                      <span className="text-gray-500">User</span>
                      <span className="font-medium text-gray-900 truncate text-right flex-1" title={detailRequest.user?.email || detailRequest.user?.full_name || detailRequest.user_id || '—'}>
                        {detailRequest.user?.email || detailRequest.user?.full_name || detailRequest.user_id || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-gray-100 gap-4">
                      <span className="text-gray-500">Pod</span>
                      <span className="font-medium text-gray-900 truncate text-right flex-1">
                        {detailCurrentPod?.code || detailCurrentPodId || '—'}
                      </span>
                    </div>
                    {isMaintenanceRequest(detailRequest.type) && ['RESOLVED', 'REJECTED', 'CANCELED'].includes(detailCurrentStatus || '') && (
                      <div className="flex justify-between items-center py-4 border-b border-gray-100">
                        <span className="text-gray-500">Severity</span>
                        <span className="font-medium text-gray-900">{detailSeverity}</span>
                      </div>
                    )}
                  </div>

                  {detailRequest.images && detailRequest.images.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Attached Images</p>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {detailRequest.images.map((img, i) => (
                          <img key={i} src={img} alt={`Attachment ${i + 1}`} className="h-24 w-auto rounded-lg border border-gray-200 object-cover" />
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Description</p>
                    <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-3 whitespace-pre-wrap">
                      {detailRequest.description || 'No description provided'}
                    </p>
                  </div>

                  {isMaintenanceRequest(detailRequest.type) && !isCompletedReq && !shouldHideManagerActions && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Maintenance Controls</p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                        <select
                          value={detailSeverity}
                          onChange={(event) => setSelectedSeverityByRequest((prev) => ({ ...prev, [detailRequest.id]: event.target.value as SupportMaintenanceSeverity }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          {SUPPORT_MAINTENANCE_SEVERITIES.map((severity) => (
                            <option key={severity} value={severity}>{severity}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {!shouldHideManagerActions && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Manager Actions</p>
                      <div className="flex flex-wrap gap-2">
                        {detailCanAccept && (
                          <button
                            type="button"
                            onClick={() => handleStartMaintenanceProcessing(detailRequest)}
                            disabled={updatingSupportId === detailRequest.id}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            Accept
                          </button>
                        )}

                        {detailCanStartWork && (
                          <button
                            type="button"
                            onClick={() => handleStartWork(detailRequest)}
                            disabled={updatingSupportId === detailRequest.id}
                            className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60"
                          >
                            Start Work
                          </button>
                        )}

                        {detailCanResolve && !isChangePodRequest(detailRequest.type) && (
                          <button
                            type="button"
                            onClick={() => openStatusTransitionModal(detailRequest, 'RESOLVED')}
                            disabled={updatingSupportId === detailRequest.id || !detailCanResolveByTasks}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Done
                          </button>
                        )}

                        {detailCanReject && (
                          <button
                            type="button"
                            onClick={() => openStatusTransitionModal(detailRequest, 'REJECTED')}
                            disabled={updatingSupportId === detailRequest.id}
                            className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        )}

                        {detailCanEscalate && (
                          <button
                            type="button"
                            onClick={() => handleEscalateMaintenance(detailRequest)}
                            disabled={updatingSupportId === detailRequest.id}
                            className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            Escalate Admin
                          </button>
                        )}
                      </div>

                      {detailCanResolve && !detailCanResolveByTasks && (
                        <p className="text-xs text-rose-600">Cannot mark as done because related tasks are not DONE/COMPLETED.</p>
                      )}
                    </div>
                  )}

                  {(() => {
                    let bg = '', iconBg = '', title = '', desc = '', Icon = null;

                    if (shouldHideManagerActions) {
                      bg = 'from-rose-50/80 to-white border-rose-100';
                      iconBg = 'bg-white text-rose-500 shadow-sm border border-rose-50';
                      title = 'Booking đã hoàn tất';
                      desc = 'Không thể tiếp tục xử lý do booking đã hoàn tất.';
                      Icon = <X className="w-6 h-6" />;
                    } else if (detailCurrentStatus === 'RESOLVED') {
                      bg = 'from-emerald-50/80 to-white border-emerald-100';
                      iconBg = 'bg-white text-emerald-500 shadow-sm border border-emerald-50';
                      title = 'Yêu cầu đã hoàn tất!';
                      desc = `Yêu cầu đã được xử lí bởi ${detailRequest.handled_by || 'quản lý'}.`;
                      Icon = <Check className="w-6 h-6" />;
                    } else if (detailCurrentStatus === 'PROCESSING' || detailCurrentStatus === 'IN_PROGRESS') {
                      bg = 'from-purple-50/80 to-white border-purple-100';
                      iconBg = 'bg-white text-purple-500 shadow-sm border border-purple-50';
                      title = 'Yêu cầu đang xử lý...';
                      desc = 'Hệ thống đang trong quá trình thực hiện công việc.';
                      Icon = <Clock className="w-6 h-6" />;
                    } else if (detailCurrentStatus === 'REJECTED' || detailCurrentStatus === 'CANCELED') {
                      bg = 'from-rose-50/80 to-white border-rose-100';
                      iconBg = 'bg-white text-rose-500 shadow-sm border border-rose-50';
                      title = detailCurrentStatus === 'REJECTED' ? 'Yêu cầu đã bị từ chối!' : 'Yêu cầu đã bị huỷ!';
                      desc = 'Yêu cầu này không thể tiếp tục thực hiện.';
                      Icon = <X className="w-6 h-6" />;
                    } else if (detailCurrentStatus === 'ESCALATED') {
                      bg = 'from-amber-50/80 to-white border-amber-100';
                      iconBg = 'bg-white text-amber-500 shadow-sm border border-amber-50';
                      title = 'Yêu cầu cần xử lý cấp cao';
                      desc = 'Yêu cầu này đang được xem xét (Escalated).';
                      Icon = <AlertCircle className="w-6 h-6" />;
                    } else {
                      bg = 'from-blue-50/80 to-white border-blue-100';
                      iconBg = 'bg-white text-blue-500 shadow-sm border border-blue-50';
                      title = 'Chờ tiếp nhận';
                      desc = 'Yêu cầu vừa được gửi và đang chờ quản lý bắt đầu xử lý.';
                      Icon = <Clock className="w-6 h-6" />;
                    }

                    return (
                      <div className={`rounded-2xl p-8 flex flex-col items-center text-center bg-gradient-to-b border shadow-sm ${bg}`}>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${iconBg}`}>
                          {Icon}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                        <p className="text-sm text-gray-600 max-w-sm">{desc}</p>
                      </div>
                    )
                  })()}

                  {detailSupportsRoomChange && !shouldHideManagerActions && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Room Change</p>

                      {detailBookingId && loadingBookingId === detailBookingId && !detailBooking && (
                        <p className="text-xs text-gray-500">Loading booking detail...</p>
                      )}

                      {loadingRoomChangeRequestId === detailRequest.id && (
                        <p className="text-xs text-gray-500">Loading replacement pods...</p>
                      )}

                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-700">
                        <p>Current pod: {detailCurrentPod?.code || detailRequest.pod?.code || detailCurrentPodId || '—'}</p>
                        <p className="mt-1">Booking status: {detailBooking?.status || detailRequest.booking?.status || '—'}</p>
                      </div>

                      {!detailCanExecuteRoomChange && (
                        <p className="text-xs text-rose-600">Room change is only allowed when booking is IN_USE.</p>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Pod</label>
                        <PodGridSelector
                          pods={candidatesForGrid}
                          selectedPodId={selectedCandidatePodId}
                          onSelect={(id) => setSelectedNewPodByRequest((prev) => ({ ...prev, [detailRequest.id]: id }))}
                        />
                        {filteredCandidates.length === 0 && (
                          <p className="text-xs text-amber-700 mt-2">No AVAILABLE replacement pod in the same parent location.</p>
                        )}
                      </div>

                      {showTierWarning && (
                        <p className="text-xs text-amber-700">Tier warning: selected pod appears lower tier than current pod. Please confirm with customer.</p>
                      )}

                      {selectedCandidate && hasTimeConflictWarning(selectedCandidate) && (
                        <p className="text-xs text-rose-600">Time conflict warning: selected pod has an upcoming booking in the remaining window.</p>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Note (optional)</label>
                        <textarea
                          rows={2}
                          value={roomChangeResolutionByRequest[detailRequest.id] || ''}
                          onChange={(event) => setRoomChangeResolutionByRequest((prev) => ({ ...prev, [detailRequest.id]: event.target.value }))}
                          placeholder="Room change note shown in request history"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleChangePodFromRequest(detailRequest)}
                        disabled={!detailCanExecuteRoomChange || !selectedCandidatePodId || isChangingPodRequestId === detailRequest.id || detailCurrentStatus === 'PROCESSING'}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition ${detailCurrentStatus === 'PROCESSING' ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        title={detailCurrentStatus === 'PROCESSING' ? "You must click 'Start Work' before confirming room change." : ''}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        {isChangingPodRequestId === detailRequest.id ? 'Changing room...' : 'Confirm Room Change & Mark Done'}
                      </button>

                      {detailCurrentStatus === 'PROCESSING' && (
                        <p className="text-xs text-amber-600 mt-2">
                          * Please check pod availability and click <b>Start Work</b> above to begin the change process.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={statusModal.isOpen}
        onClose={closeStatusTransitionModal}
        title={`Update Status: ${statusModal.targetStatus}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Request: <span className="font-medium text-gray-900">{compactId(statusModal.request?.id)}</span>
          </div>

          {statusModal.request && isMaintenanceRequest(statusModal.request.type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={statusModal.severity}
                onChange={(event) => setStatusModal((prev) => ({ ...prev, severity: event.target.value as SupportMaintenanceSeverity }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {SUPPORT_MAINTENANCE_SEVERITIES.map((severity) => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </div>
          )}

          {statusModal.targetStatus === 'ESCALATED' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Escalation Note</label>
              <textarea
                rows={4}
                value={statusModal.escalationNote}
                onChange={(event) => setStatusModal((prev) => ({ ...prev, escalationNote: event.target.value }))}
                placeholder="Explain why this request must be escalated to admin"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">Use this when HIGH/CRITICAL maintenance needs admin support after customer room change.</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {statusModal.targetStatus === 'REJECTED' ? 'Reject Reason' : 'Resolution Note'}
              </label>
              <textarea
                rows={4}
                value={statusModal.resolutionNote}
                onChange={(event) => setStatusModal((prev) => ({ ...prev, resolutionNote: event.target.value }))}
                placeholder={statusModal.targetStatus === 'REJECTED' ? 'Enter reject reason (more than 10 characters)' : 'Provide resolution details for audit history'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeStatusTransitionModal}
              className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmStatusTransition}
              disabled={updatingSupportId === statusModal.request?.id}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(roomChangeResult)}
        onClose={() => setRoomChangeResult(null)}
        title="Room Change Confirmed!"
        size="md"
      >
        <div className="space-y-4 pb-2">
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Room Moved Successfully</h3>
            <p className="text-sm text-gray-500">Booking and Smart Keys have been mapped.</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase">New Pod Information</p>
            <p className="font-bold text-gray-900 text-xl">{roomChangeResult?.new_pod?.code || '—'}</p>
            <p className="text-sm text-gray-600 mt-1">{roomChangeResult?.new_pod?.name || '—'}</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
            <p className="text-xs text-blue-800 font-semibold mb-3 uppercase flex items-center justify-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Check-in Token For User
            </p>
            {roomChangeResult?.new_pod_qr_token ? (
              <div className="flex flex-col items-center gap-2">
                <div className="px-6 py-3 bg-white border-2 border-dashed border-blue-200 rounded-lg w-full max-w-xs cursor-pointer hover:border-blue-400 transition" onClick={() => {
                  navigator.clipboard.writeText(roomChangeResult.new_pod_qr_token!)
                  toast.success('Copied token to clipboard!')
                }}>
                  <p className="font-mono text-xl tracking-widest text-blue-900 font-bold uppercase">{roomChangeResult.new_pod_qr_token}</p>
                </div>
                <p className="text-xs text-blue-700 mt-2">Mobile App already received this via notification.</p>
              </div>
            ) : (
              <p className="text-sm text-amber-700">No active QR found for this pod! App check-in required.</p>
            )}
          </div>

          <div className="mt-6 flex justify-center border-t border-gray-100 pt-5">
            <button
              onClick={() => setRoomChangeResult(null)}
              className="px-8 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
            >
              Done & Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
