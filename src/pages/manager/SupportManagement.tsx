import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, LifeBuoy, RefreshCw, Search } from 'lucide-react'
import { toast } from 'react-toastify'
import {
  supportRequestApi,
  SUPPORT_REQUEST_STATUSES,
  type SupportRequestItem,
  type SupportRequestStatus
} from '../../api/lib/supportRequestApi'
import {
  BOOKING_STATUSES,
  bookingApi,
  type BookingItem,
  type BookingStatus
} from '../../api/lib/bookingApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'

type ActiveTab = 'support_requests' | 'change_pod'

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
    case 'IN_PROGRESS':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

const bookingStatusClass = (status: BookingStatus) => {
  switch (status) {
    case 'BOOKED':
      return 'bg-blue-50 text-blue-700'
    case 'IN_USE':
      return 'bg-emerald-50 text-emerald-700'
    case 'COMPLETED':
      return 'bg-slate-100 text-slate-700'
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export const SupportManagement = () => {
  const { clusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()

  const [activeTab, setActiveTab] = useState<ActiveTab>('support_requests')
  const [pods, setPods] = useState<PodItem[]>([])
  const [isPodsLoading, setIsPodsLoading] = useState(false)

  const [supportRequests, setSupportRequests] = useState<SupportRequestItem[]>([])
  const [isSupportLoading, setIsSupportLoading] = useState(true)
  const [supportStatusFilter, setSupportStatusFilter] = useState<'all' | SupportRequestStatus>('all')
  const [supportSearch, setSupportSearch] = useState('')
  const [updatingSupportId, setUpdatingSupportId] = useState<string | null>(null)

  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [isBookingsLoading, setIsBookingsLoading] = useState(true)
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | BookingStatus>('all')
  const [bookingSearch, setBookingSearch] = useState('')
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [selectedNewPodId, setSelectedNewPodId] = useState('')
  const [isChangingPod, setIsChangingPod] = useState(false)

  const scopedClusterIds = useMemo(() => new Set(clusters.map((cluster) => cluster.id)), [clusters])
  const clusterMap = useMemo(() => new Map(clusters.map((cluster) => [cluster.id, cluster])), [clusters])
  const podMap = useMemo(() => new Map(pods.map((pod) => [pod.id, pod])), [pods])

  const scopedPods = useMemo(() => {
    if (scopedClusterIds.size === 0) return pods
    return pods.filter((pod) => scopedClusterIds.has(pod.cluster_id))
  }, [pods, scopedClusterIds])

  const sortedScopedPods = useMemo(() => {
    return [...scopedPods].sort((a, b) => (a.code || '').localeCompare(b.code || ''))
  }, [scopedPods])

  const scopedBookings = useMemo(() => {
    if (scopedClusterIds.size === 0) return bookings
    return bookings.filter((booking) => {
      const pod = podMap.get(booking.pod_id)
      return pod ? scopedClusterIds.has(pod.cluster_id) : false
    })
  }, [bookings, podMap, scopedClusterIds])

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

  const visibleBookings = useMemo(() => {
    const normalized = bookingSearch.trim().toLowerCase()
    if (!normalized) return scopedBookings

    return scopedBookings.filter((item) => {
      const pod = podMap.get(item.pod_id)
      return [
        item.id,
        item.order_id,
        item.user_id,
        item.pod?.code,
        item.pod?.name,
        pod?.code,
        pod?.name,
        item.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [bookingSearch, scopedBookings, podMap])

  const selectedBooking = useMemo(
    () => visibleBookings.find((booking) => booking.id === selectedBookingId) ?? null,
    [selectedBookingId, visibleBookings]
  )

  const selectablePods = useMemo(() => {
    if (!selectedBooking) return []

    const currentPod = podMap.get(selectedBooking.pod_id)
    if (!currentPod) return []

    const currentCluster = clusterMap.get(currentPod.cluster_id)
    if (!currentCluster) return []

    return sortedScopedPods.filter((pod) => {
      if (pod.id === currentPod.id) return false
      if (pod.status !== 'AVAILABLE') return false

      const candidateCluster = clusterMap.get(pod.cluster_id)
      if (!candidateCluster) return false

      return candidateCluster.location_id === currentCluster.location_id
    })
  }, [selectedBooking, sortedScopedPods, podMap, clusterMap])

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

  const fetchBookings = async () => {
    try {
      setIsBookingsLoading(true)
      const statusParam = bookingStatusFilter === 'all' ? 'BOOKED,IN_USE' : bookingStatusFilter
      const response = await bookingApi.getAll({
        status: statusParam,
        limit: 200
      })
      setBookings(response.bookings)
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Failed to load bookings')
      setBookings([])
    } finally {
      setIsBookingsLoading(false)
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
    fetchBookings()
  }, [bookingStatusFilter])

  useEffect(() => {
    if (!selectedBookingId) return
    const exists = visibleBookings.some((booking) => booking.id === selectedBookingId)
    if (!exists) {
      setSelectedBookingId('')
      setSelectedNewPodId('')
    }
  }, [visibleBookings, selectedBookingId])

  const handleRefresh = async () => {
    try {
      await refreshScope()
      await Promise.all([fetchPods(), fetchSupportRequests(), fetchBookings()])
      toast.success('Support data refreshed')
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Failed to refresh support data')
    }
  }

  const handleUpdateSupportStatus = async (id: string, status: SupportRequestStatus) => {
    try {
      setUpdatingSupportId(id)
      await supportRequestApi.updateStatus(id, { status })
      setSupportRequests((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
      toast.success('Support request status updated')
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Failed to update support request status')
    } finally {
      setUpdatingSupportId(null)
    }
  }

  const handleChangePod = async () => {
    if (!selectedBooking) {
      toast.error('Please choose a booking first')
      return
    }
    if (!selectedNewPodId) {
      toast.error('Please choose a new pod')
      return
    }

    try {
      setIsChangingPod(true)
      await bookingApi.changePod(selectedBooking.id, { pod_id: selectedNewPodId })
      toast.success('Booking pod changed successfully')
      setSelectedNewPodId('')
      await fetchBookings()
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError?.response?.data?.message || 'Failed to change pod for booking')
    } finally {
      setIsChangingPod(false)
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-500 mt-1">Assist users with support requests and pod changes inside your scope.</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isScopeLoading || isPodsLoading || isSupportLoading || isBookingsLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${(isScopeLoading || isPodsLoading || isSupportLoading || isBookingsLoading) ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveTab('support_requests')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            activeTab === 'support_requests'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          Support Requests
        </button>
        <button
          onClick={() => setActiveTab('change_pod')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            activeTab === 'change_pod'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Change Pod
        </button>
      </div>

      {activeTab === 'support_requests' && (
        <>
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
                    const currentStatus = item.status
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
                          <p className="text-xs text-gray-500 mt-1">Booking: {compactId(item.booking_id)}</p>
                        </td>
                        <td className="px-6 py-4 align-top text-gray-700">
                          <p>{item.pod?.code || pod?.code || '—'}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.pod?.name || pod?.name || '—'}</p>
                        </td>
                        <td className="px-6 py-4 align-top text-gray-700">{formatDateTime(item.created_at)}</td>
                        <td className="px-6 py-4 align-top">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${supportStatusClass(currentStatus)}`}>
                            {currentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <select
                            value={currentStatus}
                            onChange={(event) => handleUpdateSupportStatus(item.id, event.target.value as SupportRequestStatus)}
                            disabled={updatingSupportId === item.id}
                            className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-60"
                          >
                            {SUPPORT_REQUEST_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'change_pod' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={bookingSearch}
                  onChange={(event) => setBookingSearch(event.target.value)}
                  placeholder="Search booking by id, order id, pod..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={bookingStatusFilter}
                onChange={(event) => setBookingStatusFilter(event.target.value as 'all' | BookingStatus)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All booking statuses</option>
                {BOOKING_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Bookings in your scope</h2>
                <p className="text-xs text-gray-500 mt-1">Only bookings whose pods belong to your managed clusters are listed.</p>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {!isBookingsLoading && visibleBookings.length === 0 && (
                  <p className="px-6 py-10 text-center text-gray-500">No bookings found</p>
                )}
                {visibleBookings.map((booking) => {
                  const pod = podMap.get(booking.pod_id)
                  const isSelected = selectedBookingId === booking.id
                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() => {
                        setSelectedBookingId(booking.id)
                        setSelectedNewPodId('')
                      }}
                      className={`w-full text-left px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-gray-900">{compactId(booking.id)}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${bookingStatusClass(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Order: {compactId(booking.order_id)}</p>
                      <p className="text-xs text-gray-600 mt-1">Pod: {pod?.code || booking.pod?.code || booking.pod_id}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(booking.start_time)} - {formatDateTime(booking.end_time)}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900">Change Pod for Booking</h2>
              <p className="text-sm text-gray-500 mt-1">
                Validation rule in UI: same manager scope, same location, different pod, and target pod is not in MAINTENANCE.
              </p>

              {!selectedBooking && (
                <div className="mt-6 p-4 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
                  Select a booking from the left list to begin changing pod.
                </div>
              )}

              {selectedBooking && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-500">Booking ID</p>
                    <p className="font-medium text-gray-900 mt-1">{selectedBooking.id}</p>
                    <p className="text-xs text-gray-500 mt-3">Current Pod</p>
                    <p className="font-medium text-gray-900 mt-1">
                      {podMap.get(selectedBooking.pod_id)?.code || selectedBooking.pod?.code || selectedBooking.pod_id}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Pod</label>
                    <select
                      value={selectedNewPodId}
                      onChange={(event) => setSelectedNewPodId(event.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select new pod</option>
                      {selectablePods.map((pod) => (
                        <option key={pod.id} value={pod.id}>
                          {pod.code} - {pod.name} ({pod.status})
                        </option>
                      ))}
                    </select>
                    {selectablePods.length === 0 && (
                      <p className="text-xs text-amber-700 mt-2">No valid pod found in same location/scope for this booking.</p>
                    )}
                  </div>

                  <button
                    onClick={handleChangePod}
                    disabled={isChangingPod || !selectedNewPodId}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Confirm Change Pod
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
