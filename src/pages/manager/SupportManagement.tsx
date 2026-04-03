import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Eye, LifeBuoy, RefreshCw, Search } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  supportRequestApi,
  SUPPORT_MAINTENANCE_SEVERITIES,
  SUPPORT_REQUEST_STATUSES,
  type RoomChangeCandidatePod,
  type SupportMaintenanceSeverity,
  type SupportRequestItem,
  type SupportRequestStatus
} from '../../api/lib/supportRequestApi'
import { bookingApi, type BookingItem } from '../../api/lib/bookingApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'

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
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
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
  return 'PENDING'
}

const getCandidatePodId = (pod: RoomChangeCandidatePod) => pod.pod_id || pod.id || ''
const getCandidatePodCode = (pod: RoomChangeCandidatePod) => pod.pod_code || pod.code || ''
const getCandidatePodName = (pod: RoomChangeCandidatePod) => pod.pod_name || pod.name || ''
const getCreatedTimestamp = (item: SupportRequestItem) => item.created_at || (item as any).createdAt || null

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
  const [supportStatusFilter, setSupportStatusFilter] = useState<'all' | SupportRequestStatus>('all')
  const [supportSearch, setSupportSearch] = useState('')
  const [updatingSupportId, setUpdatingSupportId] = useState<string | null>(null)

  const [detailRequestId, setDetailRequestId] = useState<string | null>(null)
  const [selectedNewPodByRequest, setSelectedNewPodByRequest] = useState<Record<string, string>>({})
  const [isChangingPodRequestId, setIsChangingPodRequestId] = useState<string | null>(null)
  const [roomChangeCandidatesByRequest, setRoomChangeCandidatesByRequest] = useState<Record<string, RoomChangeCandidatePod[]>>({})
  const [loadingRoomChangeRequestId, setLoadingRoomChangeRequestId] = useState<string | null>(null)
  const [selectedSeverityByRequest, setSelectedSeverityByRequest] = useState<Record<string, SupportMaintenanceSeverity>>({})
  const [roomChangeResolutionByRequest, setRoomChangeResolutionByRequest] = useState<Record<string, string>>({})
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
      acc[item.status] = (acc[item.status] ?? 0) + 1
      return acc
    }, {}),
    [supportRequests]
  )

  const visibleSupportRequests = useMemo(() => {
    const normalized = supportSearch.trim().toLowerCase()
    if (!normalized) return supportRequests

    return supportRequests.filter((item) => {
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
        .includes(normalized)
    })
  }, [supportRequests, supportSearch, podMap])

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
      toast.error('Failed to load pods')
    } finally {
      setIsPodsLoading(false)
    }
  }

  const fetchSupportRequests = async () => {
    try {
      setIsSupportLoading(true)
      const response = await supportRequestApi.getAll({
        status: supportStatusFilter === 'all' ? undefined : supportStatusFilter,
        limit: 200
      })
      setSupportRequests(response.supportRequests)
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Failed to load support requests')
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
  }, [isScopeLoading, supportStatusFilter, clusters])

  useEffect(() => {
    if (!detailRequestId) return
    const exists = visibleSupportRequests.some((item) => item.id === detailRequestId)
    if (!exists) {
      setDetailRequestId(null)
    }
  }, [visibleSupportRequests, detailRequestId])

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
        toast.error(apiError?.response?.data?.message || 'Failed to load booking details')
      } finally {
        setLoadingBookingId(null)
      }
    }

    loadBooking()
  }, [detailRequest, bookingDetailsById])

  useEffect(() => {
    if (!detailRequest) return
    const supportsRoomChange = isChangePodRequest(detailRequest.type) || isMaintenanceRequest(detailRequest.type)
    if (!supportsRoomChange) return

    const resolvedBooking = bookingDetailsById[getBookingIdFromRequest(detailRequest)]
    const knownBookingStatus = String(resolvedBooking?.status || detailRequest.booking?.status || '').toUpperCase()
    if (knownBookingStatus && knownBookingStatus !== 'IN_USE') return
    if (roomChangeCandidatesByRequest[detailRequest.id]) return

    const loadCandidates = async () => {
      try {
        setLoadingRoomChangeRequestId(detailRequest.id)
        const candidates = await supportRequestApi.getRoomChangeCandidates(detailRequest.id)
        setRoomChangeCandidatesByRequest((prev) => ({ ...prev, [detailRequest.id]: candidates }))
      } catch (error: unknown) {
        const apiError = error as { response?: { data?: { message?: string } } }
        toast.error(apiError?.response?.data?.message || 'Failed to load replacement pods')
      } finally {
        setLoadingRoomChangeRequestId(null)
      }
    }

    loadCandidates()
  }, [detailRequest, roomChangeCandidatesByRequest])

  const handleRefresh = async () => {
    try {
      await refreshScope()
      await Promise.all([fetchPods(), fetchSupportRequests()])
      toast.success('Support data refreshed')
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Failed to refresh support data')
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
      toast.success('Support request status updated')
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Failed to update support request status')
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
        toast.error('Only MAINTENANCE requests can be escalated.')
        return
      }
      if (severity !== 'HIGH' && severity !== 'CRITICAL') {
        toast.error('Escalation requires HIGH or CRITICAL severity.')
        return
      }
      if (!statusModal.escalationNote.trim()) {
        toast.error('Escalation note is required.')
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
      toast.error('Resolution note is required.')
      return
    }

    if (targetStatus === 'REJECTED' && statusModal.resolutionNote.trim().length <= 10) {
      toast.error('Reject reason must be longer than 10 characters.')
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
      toast.success('Request accepted. Status updated to PROCESSING.')
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Failed to accept request.')
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
        toast.info('Server keeps this request at PROCESSING. IN_PROGRESS is currently normalized by backend.')
      } else {
        toast.success(`Work started. Status updated to ${serverStatus}.`)
      }
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Failed to start work.')
    } finally {
      setUpdatingSupportId(null)
    }
  }

  const handleEscalateMaintenance = async (request: SupportRequestItem) => {
    const severity = selectedSeverityByRequest[request.id] || normalizeSeverity(request.severity)
    if (severity !== 'HIGH' && severity !== 'CRITICAL') {
      toast.error('Escalation is only available for HIGH or CRITICAL severity.')
      return
    }

    openStatusTransitionModal(request, 'ESCALATED')
  }

  const handleChangePodFromRequest = async (request: SupportRequestItem) => {
    const selectedNewPodId = selectedNewPodByRequest[request.id]
    if (!selectedNewPodId) {
      toast.error('Please choose a new pod')
      return
    }

    const resolutionNote = (roomChangeResolutionByRequest[request.id] || '').trim()
    const maintenanceMode = isMaintenanceRequest(request.type)
    const oldPodNextStatus = maintenanceMode ? 'MAINTENANCE' : 'NEEDS_CLEANING'

    try {
      setIsChangingPodRequestId(request.id)
      await supportRequestApi.executeRoomChange(request.id, {
        target_pod_id: selectedNewPodId,
        old_pod_next_status: oldPodNextStatus,
        old_pod_reason: maintenanceMode ? (request.description || undefined) : undefined,
        resolution_note: resolutionNote || undefined,
        ...(maintenanceMode ? { severity: selectedSeverityByRequest[request.id] || normalizeSeverity(request.severity) } : {})
      })
      setSelectedNewPodByRequest((prev) => ({ ...prev, [request.id]: '' }))
      setRoomChangeResolutionByRequest((prev) => ({ ...prev, [request.id]: '' }))
      toast.success('Room changed successfully.')
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
  const detailSupportsRoomChange = detailRequest ? (isChangePodRequest(detailRequest.type) || isMaintenanceRequest(detailRequest.type)) : false
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
    const status = String(candidate.status || '').trim().toUpperCase()
    if (status !== 'AVAILABLE') return false
    const scopeLevel = String((candidate as any).scope_level || '').trim().toUpperCase()
    if (scopeLevel && scopeLevel !== 'SAME_CLUSTER' && scopeLevel !== 'SAME_PARENT_LOCATION') return false
    return true
  })

  const selectedCandidatePodId = detailRequest ? (selectedNewPodByRequest[detailRequest.id] || '') : ''
  const selectedCandidate = filteredCandidates.find((candidate) => getCandidatePodId(candidate) === selectedCandidatePodId)
  const currentTierValue = getTierValue((detailCurrentPod as any)?.pod_type ?? (detailCurrentPod as any)?.tier)
  const selectedTierValue = getTierValue((selectedCandidate as any)?.pod_type ?? (selectedCandidate as any)?.tier)
  const showTierWarning =
    currentTierValue != null && selectedTierValue != null && selectedTierValue < currentTierValue

  const detailBookingStatus = String(detailBooking?.status || detailRequest?.booking?.status || '').toUpperCase()
  const detailCanExecuteRoomChange = detailBookingStatus === 'IN_USE'

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-500 mt-1">Assist users with support requests and pod changes inside your scope.</p>
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

      <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
        <LifeBuoy className="w-4 h-4" />
        Support Requests
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-l-blue-500">
          <p className="text-xs font-medium text-gray-500">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{supportRequests.length}</p>
        </div>
        {SUPPORT_REQUEST_STATUSES.map((status) => (
          <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500">{status}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{supportStats[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={supportSearch}
              onChange={(event) => setSupportSearch(event.target.value)}
              placeholder="Search support requests..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={supportStatusFilter}
            onChange={(event) => setSupportStatusFilter(event.target.value as 'all' | SupportRequestStatus)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All statuses</option>
            {SUPPORT_REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Request</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">User / Booking</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Pod</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Created</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Status</th>
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
                      <p className="text-xs text-gray-500 mt-1">{compactId(item.id)}</p>
                      {item.description && (
                        <p className="text-xs text-gray-600 mt-2 max-w-md line-clamp-2">{item.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-700">
                      <p>{item.user?.full_name || item.user?.email || compactId(item.user_id)}</p>
                      <p className="text-xs text-gray-500 mt-1">Booking: {compactId(getBookingIdFromRequest(item))}</p>
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
                      <button
                        type="button"
                        onClick={() => openDetailModal(item)}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4" />
                        View detail
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={Boolean(detailRequest)}
        onClose={closeDetailModal}
        title="Support Request Detail"
        size="xl"
      >
        {detailRequest && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-gray-100 p-3 bg-gray-50">
                <p className="text-gray-500">Request ID</p>
                <p className="font-medium text-gray-900 mt-1">{detailRequest.id}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 bg-gray-50">
                <p className="text-gray-500">Status</p>
                <p className="font-medium text-gray-900 mt-1">{detailCurrentStatus}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 bg-gray-50">
                <p className="text-gray-500">Type</p>
                <p className="font-medium text-gray-900 mt-1">{detailRequest.type || '—'}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 bg-gray-50">
                <p className="text-gray-500">Created</p>
                <p className="font-medium text-gray-900 mt-1">{formatDateTime(getCreatedTimestamp(detailRequest))}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Description</p>
              <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{detailRequest.description || '—'}</p>
            </div>

            {isMaintenanceRequest(detailRequest.type) && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900">Maintenance Controls</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                  <select
                    value={detailSeverity}
                    onChange={(event) => setSelectedSeverityByRequest((prev) => ({ ...prev, [detailRequest.id]: event.target.value as SupportMaintenanceSeverity }))}
                    className="w-full md:w-[240px] px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {SUPPORT_MAINTENANCE_SEVERITIES.map((severity) => (
                      <option key={severity} value={severity}>{severity}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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

                {detailCanResolve && (
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

            {detailSupportsRoomChange && (
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
                  <select
                    value={selectedCandidatePodId}
                    onChange={(event) => setSelectedNewPodByRequest((prev) => ({ ...prev, [detailRequest.id]: event.target.value }))}
                    className="w-full md:w-[520px] px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select new pod</option>
                    {filteredCandidates.map((candidatePod) => (
                      <option key={getCandidatePodId(candidatePod)} value={getCandidatePodId(candidatePod)}>
                        {getCandidatePodCode(candidatePod)} - {getCandidatePodName(candidatePod)} ({candidatePod.status})
                      </option>
                    ))}
                  </select>
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
                    className="w-full md:w-[520px] px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleChangePodFromRequest(detailRequest)}
                  disabled={!detailCanExecuteRoomChange || !selectedCandidatePodId || isChangingPodRequestId === detailRequest.id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {isChangingPodRequestId === detailRequest.id ? 'Changing room...' : 'Confirm Room Change'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

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
    </div>
  )
}
