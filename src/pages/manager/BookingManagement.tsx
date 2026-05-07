/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  ClipboardList,
  Eye,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  SlidersHorizontal,
  Check,
  CheckCircle,
  Clock,

  CreditCard,
  Ban,
  Boxes
} from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  BOOKING_STATUSES,
  bookingApi,
  type BookingItem,
  type BookingStatus
} from '../../api/lib/bookingApi'
import {
  BOOKING_ORDER_STATUSES,
  bookingOrderApi,
  type BookingOrderDetail,
  type BookingOrderItem,
  type BookingOrderPagination,
  type BookingOrderStatus,
  type OrderIncidentItem
} from '../../api/lib/bookingOrderApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { PodGridSelector } from '../../components/common/PodGridSelector'
import { useCheckinContext } from '../../components/common/ManagerCheckinGate'
import { initUserSocket } from '../../lib/socket'

type ActiveTab = 'bookings' | 'orders'

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN')
}

const formatMoney = (value?: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

const compactId = (value?: string | null) => {
  if (!value) return '—'
  if (value.length <= 16) return value
  return `${value.slice(0, 8)}...${value.slice(-6)}`
}

const bookingStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'BOOKED':
      return 'bg-blue-50 text-blue-700'
    case 'IN_USE':
      return 'bg-emerald-50 text-emerald-700'
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-700'
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

const orderStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700'
    case 'PENDING':
      return 'bg-amber-50 text-amber-700'
    case 'PARTIAL_CANCEL':
      return 'bg-orange-50 text-orange-700'
    case 'FULLY_CANCELLED':
    case 'CANCEL':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

const bookingStatusBgColor = (status: string) => {
  switch (status) {
    case 'BOOKED': return 'bg-blue-500'
    case 'IN_USE': return 'bg-emerald-500'
    case 'COMPLETED': return 'bg-gray-500'
    case 'CANCELLED': return 'bg-rose-500'
    default: return 'bg-slate-500'
  }
}

const orderStatusBgColor = (status: string) => {
  switch (status) {
    case 'PAID': return 'bg-emerald-500'
    case 'PENDING': return 'bg-amber-500'
    case 'PARTIAL_CANCEL': return 'bg-orange-500'
    case 'FULLY_CANCELLED':
    case 'CANCEL': return 'bg-rose-500'
    default: return 'bg-slate-500'
  }
}

const incidentStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'DISMISSED':
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200'
  }
}

const translateIncidentStatus = (status: string) => {
  switch (status) {
    case 'PENDING': return 'Chờ xử lý'
    case 'RESOLVED': return 'Đã giải quyết'
    case 'DISMISSED': return 'Đã từ chối'
    default: return status
  }
}

const translateIncidentSeverity = (severity: string) => {
  switch (severity) {
    case 'LOW': return 'Thấp'
    case 'MEDIUM': return 'Trung bình'
    case 'HIGH': return 'Cao'
    case 'CRITICAL': return 'Nghiêm trọng'
    default: return severity
  }
}

const incidentSeverityBadgeClass = (severity: string) => {
  switch (severity) {
    case 'LOW':
      return 'bg-slate-100 text-slate-700'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800'
    case 'CRITICAL':
      return 'bg-rose-100 text-rose-800 font-semibold'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export const BookingManagement = () => {
  const { clusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()
  const { isReadOnly } = useCheckinContext()

  const [activeTab, setActiveTab] = useState<ActiveTab>('bookings')
  const [pods, setPods] = useState<PodItem[]>([])
  const [isPodsLoading, setIsPodsLoading] = useState(false)

  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [isBookingsLoading, setIsBookingsLoading] = useState(true)
  const [bookingPage, setBookingPage] = useState(1)
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus[]>([])
  const [bookingPodFilter, setBookingPodFilter] = useState<string[]>([])
  const [bookingOrderFilter, setBookingOrderFilter] = useState('')
  const [bookingStartFilter, setBookingStartFilter] = useState('')
  const [bookingEndFilter, setBookingEndFilter] = useState('')
  const [bookingPagination, setBookingPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 20
  })

  const [orders, setOrders] = useState<BookingOrderItem[]>([])
  const [isOrdersLoading, setIsOrdersLoading] = useState(true)
  const [orderPage, setOrderPage] = useState(1)
  const [orderStatusFilter, setOrderStatusFilter] = useState<BookingOrderStatus[]>([])
  const [orderPodFilter, setOrderPodFilter] = useState<string[]>([])
  const [orderStartFilter, setOrderStartFilter] = useState('')
  const [orderEndFilter, setOrderEndFilter] = useState('')
  const [orderPagination, setOrderPagination] = useState<BookingOrderPagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  })

  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [draftBookingFilters, setDraftBookingFilters] = useState<{
    status: BookingStatus[]
    pod_id: string[]
    dateRange: [Date | null, Date | null]
  }>({
    status: [],
    pod_id: [],
    dateRange: [null, null]
  })


  const [draftOrderFilters, setDraftOrderFilters] = useState<{
    status: BookingOrderStatus[]
    pod_id: string[]
    dateRange: [Date | null, Date | null]
  }>({
    status: [],
    pod_id: [],
    dateRange: [null, null]
  })

  const [isBookingDetailOpen, setIsBookingDetailOpen] = useState(false)
  const [isBookingDetailLoading, setIsBookingDetailLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null)

  const [isRelatedOpen, setIsRelatedOpen] = useState(false)
  const [isRelatedLoading, setIsRelatedLoading] = useState(false)
  const [relatedTitle, setRelatedTitle] = useState('')
  const [relatedBookings, setRelatedBookings] = useState<BookingItem[]>([])

  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false)
  const [isOrderDetailLoading, setIsOrderDetailLoading] = useState(false)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<BookingOrderDetail | null>(null)
  const [selectedOrderIncidents, setSelectedOrderIncidents] = useState<OrderIncidentItem[]>([])
  const [isOrderIncidentsLoading, setIsOrderIncidentsLoading] = useState(false)
  const [isCreatingDamageBill, setIsCreatingDamageBill] = useState(false)

  const [updatingCleanerAccessId, setUpdatingCleanerAccessId] = useState<string | null>(null)

  const scopedClusterIds = useMemo(() => new Set(clusters.map((cluster) => cluster.id)), [clusters])

  const scopedPods = useMemo(() => {
    if (scopedClusterIds.size === 0) return pods
    return pods.filter((pod) => scopedClusterIds.has(pod.cluster_id))
  }, [pods, scopedClusterIds])

  const podOptions = useMemo(() => {
    const uniqueMap = new Map()
    for (const pod of scopedPods) {
      if (!uniqueMap.has(pod.id)) uniqueMap.set(pod.id, pod)
    }
    return Array.from(uniqueMap.values()).sort((a, b) => (a.code || '').localeCompare(b.code || ''))
  }, [scopedPods])

  const podMap = useMemo(
    () => new Map(podOptions.map((pod) => [pod.id, pod])),
    [podOptions]
  )

  const fetchPods = async () => {
    try {
      setIsPodsLoading(true)
      const response = await podApi.getAll()
      setPods(response.data)
    } catch (error: unknown) {
      console.error(error)
      setPods([])
    } finally {
      setIsPodsLoading(false)
    }
  }

  const fetchBookings = async (page: number) => {
    try {
      setIsBookingsLoading(true)

      const startDate = bookingStartFilter ? new Date(bookingStartFilter) : null
      const endDate = bookingEndFilter ? new Date(bookingEndFilter) : null

      const response = await bookingApi.getAll({
        page,
        limit: bookingPagination.items_per_page,
        status: bookingStatusFilter.length > 0 ? bookingStatusFilter.join(',') : undefined,
        pod_id: bookingPodFilter.length > 0 ? bookingPodFilter.join(',') : undefined,
        order_id: bookingOrderFilter.trim() || undefined,
        start_date: startDate ? startDate.toISOString() : undefined,
        end_date: endDate ? endDate.toISOString() : undefined
      })

      setBookings(response.bookings)
      setBookingPagination(
        response.pagination ?? {
          current_page: page,
          total_pages: 1,
          total_items: response.bookings.length,
          items_per_page: 20
        }
      )
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load bookings')
      setBookings([])
      setBookingPagination({ current_page: 1, total_pages: 1, total_items: 0, items_per_page: 20 })
    } finally {
      setIsBookingsLoading(false)
    }
  }

  const fetchOrders = async (page: number) => {
    try {
      setIsOrdersLoading(true)

      const startDate = orderStartFilter ? new Date(orderStartFilter) : null
      const endDate = orderEndFilter ? new Date(orderEndFilter) : null

      const response = await bookingOrderApi.getAll({
        page,
        limit: orderPagination.limit,
        status: orderStatusFilter.length > 0 ? orderStatusFilter.join(',') : undefined,
        pod_ids: orderPodFilter.length > 0 ? orderPodFilter.join(',') : undefined,
        start_date: startDate ? startDate.toISOString() : undefined,
        end_date: endDate ? endDate.toISOString() : undefined
      })

      setOrders(response.orders)
      setOrderPagination(response.pagination)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load booking orders')
      setOrders([])
      setOrderPagination({ total: 0, page: 1, limit: 20, pages: 1 })
    } finally {
      setIsOrdersLoading(false)
    }
  }

  useEffect(() => {
    if (isScopeLoading) return
    fetchPods()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScopeLoading, clusters])

  useEffect(() => {
    fetchBookings(bookingPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingPage, bookingStatusFilter, bookingPodFilter, bookingOrderFilter, bookingStartFilter, bookingEndFilter, refreshTrigger])

  useEffect(() => {
    fetchOrders(orderPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderPage, orderStatusFilter, orderPodFilter, orderStartFilter, orderEndFilter, refreshTrigger])

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

  const handleRefresh = async () => {
    try {
      await refreshScope()
      await Promise.all([fetchPods(), fetchBookings(bookingPage), fetchOrders(orderPage)])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to refresh data')
    }
  }

  const openBookingDetail = async (bookingId: string) => {
    setIsBookingDetailOpen(true)
    setIsBookingDetailLoading(true)
    setSelectedBooking(null)

    try {
      const booking = await bookingApi.getById(bookingId)
      setSelectedBooking(booking)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load booking detail')
      setIsBookingDetailOpen(false)
    } finally {
      setIsBookingDetailLoading(false)
    }
  }

  const openRelatedBookingsByPod = async (podId: string) => {
    setIsRelatedOpen(true)
    setIsRelatedLoading(true)
    setRelatedBookings([])
    setRelatedTitle(`Bookings in pod ${podMap.get(podId)?.code ?? compactId(podId)}`)

    try {
      const data = await bookingApi.getByPod(podId)
      setRelatedBookings(data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load bookings by pod')
      setIsRelatedOpen(false)
    } finally {
      setIsRelatedLoading(false)
    }
  }

  const openRelatedBookingsByOrder = async (orderId: string) => {
    setIsRelatedOpen(true)
    setIsRelatedLoading(true)
    setRelatedBookings([])
    setRelatedTitle(`Bookings in order ${compactId(orderId)}`)

    try {
      const data = await bookingApi.getByOrder(orderId)
      setRelatedBookings(data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load bookings by order')
      setIsRelatedOpen(false)
    } finally {
      setIsRelatedLoading(false)
    }
  }

  const handleToggleCleanerAccess = async (booking: BookingItem) => {
    const nextAllowed = !booking.cleaner_access_allowed

    try {
      setUpdatingCleanerAccessId(booking.id)
      const updated = await bookingApi.setCleanerAccess(booking.id, nextAllowed)

      setBookings((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
      setRelatedBookings((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
      if (selectedBooking?.id === updated.id) {
        setSelectedBooking((prev) => (prev ? { ...prev, ...updated } : prev))
      }

      toast.success(`Cleaner access ${nextAllowed ? 'enabled' : 'disabled'}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update cleaner access')
    } finally {
      setUpdatingCleanerAccessId(null)
    }
  }

  const openOrderDetail = async (orderId: string) => {
    setIsOrderDetailOpen(true)
    setIsOrderDetailLoading(true)
    setSelectedOrderDetail(null)
    setIsOrderIncidentsLoading(true)
    setSelectedOrderIncidents([])

    try {
      const detail = await bookingOrderApi.getById(orderId)
      setSelectedOrderDetail(detail)
      const incidents = await bookingOrderApi.getOrderIncidents(orderId)
      setSelectedOrderIncidents(incidents)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load booking order detail')
      setIsOrderDetailOpen(false)
    } finally {
      setIsOrderDetailLoading(false)
      setIsOrderIncidentsLoading(false)
    }
  }

  const handleCreateDamageBill = async () => {
    if (!selectedOrderDetail) return
    try {
      setIsCreatingDamageBill(true)
      await bookingOrderApi.createOrderDamageBill(selectedOrderDetail.order.id)
      toast.success('Damage Bill created successfully for the order')

      // Refresh both incidents and order detail to show the new billing info
      const [refreshedIncidents, refreshedOrderDetail] = await Promise.all([
        bookingOrderApi.getOrderIncidents(selectedOrderDetail.order.id),
        bookingOrderApi.getById(selectedOrderDetail.order.id)
      ])

      setSelectedOrderIncidents(refreshedIncidents)
      if (refreshedOrderDetail) {
        setSelectedOrderDetail(refreshedOrderDetail)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create damage bill')
    } finally {
      setIsCreatingDamageBill(false)
    }
  }

  const bookingCountsByStatus = useMemo(() => {
    return bookings.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1
      return acc
    }, {})
  }, [bookings])

  const orderCountsByStatus = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1
      return acc
    }, {})
  }, [orders])

  const openFilterPanel = () => {
    if (activeTab === 'bookings') {
      setDraftBookingFilters({
        status: bookingStatusFilter,
        pod_id: bookingPodFilter,
        dateRange: [
          bookingStartFilter ? new Date(bookingStartFilter) : null,
          bookingEndFilter ? new Date(bookingEndFilter) : null
        ]
      })
    } else {
      setDraftOrderFilters({
        status: orderStatusFilter,
        pod_id: orderPodFilter,
        dateRange: [
          orderStartFilter ? new Date(orderStartFilter) : null,
          orderEndFilter ? new Date(orderEndFilter) : null
        ]
      })
    }
    setIsFilterPanelOpen(true)
  }

  const applyFilters = () => {
    if (activeTab === 'bookings') {
      setBookingStatusFilter(draftBookingFilters.status)
      setBookingPodFilter(draftBookingFilters.pod_id)
      setBookingStartFilter(draftBookingFilters.dateRange[0] ? dayjs(draftBookingFilters.dateRange[0]).format('YYYY-MM-DDTHH:mm') : '')
      setBookingEndFilter(draftBookingFilters.dateRange[1] ? dayjs(draftBookingFilters.dateRange[1]).format('YYYY-MM-DDTHH:mm') : '')
      setBookingPage(1)
    } else {
      setOrderStatusFilter(draftOrderFilters.status)
      setOrderPodFilter(draftOrderFilters.pod_id)
      setOrderStartFilter(draftOrderFilters.dateRange[0] ? dayjs(draftOrderFilters.dateRange[0]).format('YYYY-MM-DDTHH:mm') : '')
      setOrderEndFilter(draftOrderFilters.dateRange[1] ? dayjs(draftOrderFilters.dateRange[1]).format('YYYY-MM-DDTHH:mm') : '')
      setOrderPage(1)
    }
    setIsFilterPanelOpen(false)
  }

  const resetDraftFilters = () => {
    if (activeTab === 'bookings') {
      setDraftBookingFilters({ status: [], pod_id: [], dateRange: [null, null] })
    } else {
      setDraftOrderFilters({ status: [], pod_id: [], dateRange: [null, null] })
    }
  }

  const toggleArrayFilter = <T extends string>(current: T[], value: T | 'all', fullLength: number): T[] => {
    if (value === 'all') return []
    if (current.includes(value as T)) return current.filter(v => v !== value)
    const nextArr = [...current, value as T]
    if (nextArr.length === fullLength) return []
    return nextArr
  }

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-500 mt-1">
            Monitor bookings and booking orders inside your assigned manager scope.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isScopeLoading || isPodsLoading || isBookingsLoading || isOrdersLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isScopeLoading || isBookingsLoading || isOrdersLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-5 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-[220px] pr-4 xl:border-r xl:border-gray-200">
              <p className="text-xs uppercase font-semibold tracking-wide text-gray-500">
                {activeTab === 'bookings' ? 'Total Bookings' : 'Total Orders'}
              </p>
              <p className="text-[34px] leading-tight font-bold text-gray-900 mt-1">
                {activeTab === 'bookings' ? bookingPagination.total_items : orderPagination.total}
              </p>
            </div>

            {activeTab === 'bookings' ? (
              <div className="min-w-[500px] flex-1 py-1">
                <p className="text-sm font-semibold text-gray-900 mb-1.5">{bookings.length} current page items</p>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-1.5">
                  {BOOKING_STATUSES.map((status) => {
                    const count = bookingCountsByStatus[status] || 0
                    const percent = bookings.length > 0 ? (count / bookings.length) * 100 : 0
                    return percent > 0 ? (
                      <div key={status} className={bookingStatusBgColor(status)} style={{ width: `${percent}%` }} />
                    ) : null
                  })}
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {BOOKING_STATUSES.filter(s => bookingCountsByStatus[s]).map((status) => (
                    <span key={status} className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <span className={`w-2 h-2 rounded-full ${bookingStatusBgColor(status)}`} />
                      {status}: {bookingCountsByStatus[status]}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="min-w-[500px] flex-1 py-1">
                <p className="text-sm font-semibold text-gray-900 mb-1.5">{orders.length} current page items</p>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-1.5">
                  {BOOKING_ORDER_STATUSES.map((status) => {
                    const count = orderCountsByStatus[status] || 0
                    const percent = orders.length > 0 ? (count / orders.length) * 100 : 0
                    return percent > 0 ? (
                      <div key={status} className={orderStatusBgColor(status)} style={{ width: `${percent}%` }} />
                    ) : null
                  })}
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {BOOKING_ORDER_STATUSES.filter(s => orderCountsByStatus[s]).map((status) => (
                    <span key={status} className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <span className={`w-2 h-2 rounded-full ${orderStatusBgColor(status)}`} />
                      {status}: {orderCountsByStatus[status]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={bookingOrderFilter}
                onChange={(e) => {
                  if (activeTab === 'bookings') {
                    setBookingPage(1); setBookingOrderFilter(e.target.value)
                  }
                }}
                placeholder={activeTab === 'bookings' ? "Search order ID..." : "Search disable in orders"}
                disabled={activeTab === 'orders'}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100"
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

      <div className="bg-white rounded-xl border border-gray-100 p-1 mb-6 inline-flex">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'bookings' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          onClick={() => setActiveTab('bookings')}
        >
          <span className="inline-flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Bookings
          </span>
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          onClick={() => setActiveTab('orders')}
        >
          <span className="inline-flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Booking Orders
          </span>
        </button>
      </div>

      {activeTab === 'bookings' ? (
        <>


          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Scoped Bookings</h2>
              <span className="text-sm text-gray-500">{bookingPagination.total_items} item(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pod</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cleaner Access</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isBookingsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading bookings...</td>
                    </tr>
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No bookings found in your scope.</td>
                    </tr>
                  ) : (
                    bookings.map((booking) => {
                      const pod = podMap.get(booking.pod_id)
                      const isUpdating = updatingCleanerAccessId === booking.id

                      return (
                        <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 align-top">
                            <p className="font-semibold text-gray-900">{compactId(booking.id)}</p>
                            <p className="text-xs text-gray-500 mt-1">{booking.id}</p>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <p className="font-medium text-gray-800">{pod?.code ?? booking.pod?.code ?? compactId(booking.pod_id)}</p>
                            <p className="text-xs text-gray-500 mt-1">{pod?.name ?? booking.pod?.name ?? '—'}</p>
                          </td>
                          <td className="px-6 py-4 align-top text-gray-700">{compactId(booking.order_id)}</td>
                          <td className="px-6 py-4 align-top text-gray-600">
                            <p>{formatDateTime(booking.start_time)}</p>
                            <p className="text-xs text-gray-500 mt-1">to {formatDateTime(booking.end_time)}</p>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bookingStatusBadgeClass(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${booking.cleaner_access_allowed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
                                  }`}
                              >
                                {booking.cleaner_access_allowed ? 'Allowed' : 'Disabled'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleCleanerAccess(booking)}
                                disabled={isUpdating || isReadOnly}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                              >
                                {booking.cleaner_access_allowed ? (
                                  <ShieldOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Shield className="w-3.5 h-3.5" />
                                )}
                                {isUpdating ? 'Saving...' : 'Toggle'}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openBookingDetail(booking.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Detail
                              </button>
                              <button
                                type="button"
                                onClick={() => openRelatedBookingsByPod(booking.pod_id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                By Pod
                              </button>
                              <button
                                type="button"
                                onClick={() => openRelatedBookingsByOrder(booking.order_id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                By Order
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {bookingPagination.current_page} / {bookingPagination.total_pages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBookingPage((prev) => Math.max(prev - 1, 1))}
                  disabled={bookingPagination.current_page <= 1 || isBookingsLoading}
                  className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setBookingPage((prev) => Math.min(prev + 1, bookingPagination.total_pages || 1))}
                  disabled={bookingPagination.current_page >= bookingPagination.total_pages || isBookingsLoading}
                  className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Scoped Booking Orders</h2>
              <span className="text-sm text-gray-500">{orderPagination.total} item(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isOrdersLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading booking orders...</td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No booking orders found in your scope.</td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 align-top">
                          <p className="font-semibold text-gray-900">{compactId(order.id)}</p>
                          <p className="text-xs text-gray-500 mt-1">{order.id}</p>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <p className="font-medium text-gray-800">{order.user?.name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500 mt-1">{order.user?.email || '—'}</p>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${orderStatusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-gray-700">{order.bookings_count ?? 0}</td>
                        <td className="px-6 py-4 align-top text-gray-700">{formatMoney(order.final_total_price)}</td>
                        <td className="px-6 py-4 align-top text-gray-600">{formatDateTime(order.createdAt)}</td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openOrderDetail(order.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-100"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {orderPagination.page} / {Math.max(orderPagination.pages, 1)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrderPage((prev) => Math.max(prev - 1, 1))}
                  disabled={orderPagination.page <= 1 || isOrdersLoading}
                  className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setOrderPage((prev) => Math.min(prev + 1, Math.max(orderPagination.pages, 1)))}
                  disabled={orderPagination.page >= orderPagination.pages || isOrdersLoading}
                  className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        title="Bộ lọc nâng cao"
        size="2xl"
      >
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">Trạng thái {activeTab === 'bookings' ? 'Booking' : 'Đơn hàng'}</label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => resetDraftFilters()}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${activeTab === 'bookings'
                    ? (draftBookingFilters.status.length === 0 ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50')
                    : (draftOrderFilters.status.length === 0 ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50')
                  }`}
              >
                Tất cả
              </button>
              {(activeTab === 'bookings' ? BOOKING_STATUSES : BOOKING_ORDER_STATUSES).map((status: any) => {
                const isSelected = activeTab === 'bookings'
                  ? draftBookingFilters.status.includes(status)
                  : draftOrderFilters.status.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      if (activeTab === 'bookings') {
                        setDraftBookingFilters(prev => ({ ...prev, status: toggleArrayFilter(prev.status, status, BOOKING_STATUSES.length) }))
                      } else {
                        setDraftOrderFilters(prev => ({ ...prev, status: toggleArrayFilter(prev.status, status, BOOKING_ORDER_STATUSES.length) }))
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline-block mr-1.5 -ml-0.5" />}
                    {status}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">Lọc theo Pod</label>
            </div>
            <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
              <PodGridSelector
                pods={podOptions}
                selectedPodId={activeTab === 'bookings' ? draftBookingFilters.pod_id : draftOrderFilters.pod_id}
                onSelect={(id) => {
                  if (activeTab === 'bookings') {
                    setDraftBookingFilters(prev => ({ ...prev, pod_id: toggleArrayFilter(prev.pod_id, id, podOptions.length) }))
                  } else {
                    setDraftOrderFilters(prev => ({ ...prev, pod_id: toggleArrayFilter(prev.pod_id, id, podOptions.length) }))
                  }
                }}
                showAllOption={true}
                allOptionLabel="Tất cả Pod"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">Khoảng thời gian</label>
            </div>
            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white p-6 shadow-inner custom-calendar">
              <DatePicker
                selected={activeTab === 'bookings' ? draftBookingFilters.dateRange[0] : draftOrderFilters.dateRange[0]}
                onChange={(update: [Date | null, Date | null]) => {
                  if (activeTab === 'bookings') {
                    setDraftBookingFilters(prev => ({ ...prev, dateRange: update }))
                  } else {
                    setDraftOrderFilters(prev => ({ ...prev, dateRange: update }))
                  }
                }}
                startDate={(activeTab === 'bookings' ? draftBookingFilters.dateRange[0] : draftOrderFilters.dateRange[0]) || undefined}
                endDate={(activeTab === 'bookings' ? draftBookingFilters.dateRange[1] : draftOrderFilters.dateRange[1]) || undefined}
                selectsRange
                inline
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={resetDraftFilters}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Thiết lập lại
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </div>
        </div>
      </Modal>


      <Modal
        isOpen={isBookingDetailOpen}
        onClose={() => {
          setIsBookingDetailOpen(false)
          setSelectedBooking(null)
          setIsBookingDetailLoading(false)
        }}
        title="Chi tiết Booking"
        size="5xl"
      >
        {isBookingDetailLoading ? (
          <div className="py-20 text-center text-gray-500">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="animate-pulse">Đang tải chi tiết booking...</p>
          </div>
        ) : !selectedBooking ? (
          <div className="py-20 text-center text-gray-400">Không có dữ liệu booking.</div>
        ) : (
          <div className="space-y-8">
            {(() => {
              let bg = '', iconBg = '', title = '', desc = '', Icon = null;
              if (selectedBooking.status === 'IN_USE') {
                bg = 'from-emerald-50 to-white border-emerald-100';
                iconBg = 'bg-white text-emerald-500 shadow-sm border border-emerald-50';
                title = 'Đang sử dụng'; desc = 'Booking hiện đang hoạt động.'; Icon = <Clock className="w-8 h-8" />;
              } else if (selectedBooking.status === 'BOOKED') {
                bg = 'from-blue-50 to-white border-blue-100';
                iconBg = 'bg-white text-blue-500 shadow-sm border border-blue-50';
                title = 'Đã đặt'; desc = 'Booking đã được xác nhận và sắp tới.'; Icon = <CalendarClock className="w-8 h-8" />;
              } else if (selectedBooking.status === 'COMPLETED') {
                bg = 'from-gray-50 to-white border-gray-100';
                iconBg = 'bg-white text-gray-500 shadow-sm border border-gray-50';
                title = 'Hoàn tất'; desc = 'Booking đã kết thúc.'; Icon = <CheckCircle className="w-8 h-8" />;
              } else if (selectedBooking.status === 'CANCELLED') {
                bg = 'from-rose-50 to-white border-rose-100';
                iconBg = 'bg-white text-rose-500 shadow-sm border border-rose-50';
                title = 'Đã hủy'; desc = 'Booking đã bị hủy.'; Icon = <Ban className="w-8 h-8" />;
              } else {
                bg = 'from-gray-50 to-white border-gray-100';
                iconBg = 'bg-white text-gray-500 shadow-sm border border-gray-50';
                title = selectedBooking.status; desc = 'Trạng thái booking đang chờ.'; Icon = <Boxes className="w-8 h-8" />;
              }

              return (
                <div className={`rounded-3xl p-10 flex flex-col items-center text-center bg-gradient-to-b border shadow-sm ${bg}`}>
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${iconBg}`}>
                    {Icon}
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h3>
                  <p className="text-sm text-gray-600 max-w-sm leading-relaxed">{desc}</p>
                </div>
              )
            })()}

            {selectedBooking.status === 'COMPLETED' && (
              <div className="p-5 rounded-2xl bg-gray-50/50 border border-gray-100 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 border border-gray-200 shadow-sm">
                  <ShieldOff className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Booking đã hoàn tất</p>
                  <p className="text-xs text-gray-500 mt-0.5">Mọi thao tác quản lý đã bị vô hiệu hóa để bảo vệ dữ liệu lịch sử.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">Thông tin định danh</h4>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex flex-col gap-1 py-1 border-b border-gray-50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Booking ID</span>
                    <span className="text-sm font-mono font-bold text-gray-900 break-all">{selectedBooking.id}</span>
                  </div>
                  <div className="flex flex-col gap-1 py-1 border-b border-gray-50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Order ID</span>
                    <span className="text-sm font-mono font-bold text-gray-900 break-all">{selectedBooking.order_id}</span>
                  </div>
                  <div className="flex flex-col gap-1 py-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Pod ID</span>
                    <span className="text-sm font-mono font-bold text-gray-900 break-all">{selectedBooking.pod_id}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">Lịch trình & Chi phí</h4>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between py-1 border-b border-gray-50">
                    <span className="text-xs font-bold text-gray-500 uppercase">Bắt đầu</span>
                    <span className="text-sm font-bold text-gray-900">{formatDateTime(selectedBooking.start_time)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-50">
                    <span className="text-xs font-bold text-gray-500 uppercase">Kết thúc</span>
                    <span className="text-sm font-bold text-gray-900">{formatDateTime(selectedBooking.end_time)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-50">
                    <span className="text-xs font-bold text-gray-500 uppercase">Check-in</span>
                    <span className="text-sm font-bold text-blue-600">{selectedBooking.checkin_state || 'Chưa check-in'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-bold text-gray-500 uppercase">Tổng cộng</span>
                    <span className="text-lg font-bold text-emerald-600">{formatMoney(selectedBooking.total_price)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsBookingDetailOpen(false)}
                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>


      <Modal
        isOpen={isRelatedOpen}
        onClose={() => {
          setIsRelatedOpen(false)
          setRelatedBookings([])
          setIsRelatedLoading(false)
          setRelatedTitle('')
        }}
        title={relatedTitle || 'Related Bookings'}
        size="xl"
      >
        {isRelatedLoading ? (
          <div className="py-8 text-center text-gray-500">Loading related bookings...</div>
        ) : relatedBookings.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No related bookings found.</div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
            {relatedBookings.map((booking) => (
              <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{compactId(booking.id)}</p>
                    <p className="text-xs text-gray-500 mt-1">{booking.id}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bookingStatusBadgeClass(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm text-gray-600">
                  <p>
                    <span className="text-gray-500">Pod:</span> {podMap.get(booking.pod_id)?.code ?? compactId(booking.pod_id)}
                  </p>
                  <p>
                    <span className="text-gray-500">Order:</span> {compactId(booking.order_id)}
                  </p>
                  <p>
                    <span className="text-gray-500">Cleaner:</span> {booking.cleaner_access_allowed ? 'Allowed' : 'Disabled'}
                  </p>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={() => openBookingDetail(booking.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Open detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isOrderDetailOpen}
        onClose={() => {
          setIsOrderDetailOpen(false)
          setSelectedOrderDetail(null)
          setIsOrderDetailLoading(false)
        }}
        title="Chi tiết Đơn hàng"
        size="7xl"
      >
        {isOrderDetailLoading ? (
          <div className="py-20 text-center text-gray-500">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4 text-emerald-500" />
            <p className="animate-pulse font-medium">Đang tải chi tiết đơn hàng...</p>
          </div>
        ) : !selectedOrderDetail ? (
          <div className="py-20 text-center text-gray-400">Không có dữ liệu đơn hàng.</div>
        ) : (
          <div className="flex-1 -m-6 bg-gray-50/50">
            <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] min-h-[600px]">
              {/* Left Column: Summary */}
              <div className="w-full lg:w-[400px] shrink-0 p-6 lg:p-8 lg:border-r border-gray-100 overflow-y-auto">
                <div className="space-y-8">
                  {(() => {
                    let bg = '', iconBg = '', title = '', desc = '', Icon = null;
                    if (selectedOrderDetail.order.status === 'PAID') {
                      bg = 'bg-white border-emerald-100 shadow-emerald-50';
                      iconBg = 'bg-emerald-50 text-emerald-600';
                      title = 'Đã thanh toán'; desc = 'Giao dịch hoàn tất thành công.'; Icon = <CheckCircle className="w-6 h-6" />;
                    } else if (selectedOrderDetail.order.status === 'PENDING') {
                      bg = 'bg-white border-amber-100 shadow-amber-50';
                      iconBg = 'bg-amber-50 text-amber-600';
                      title = 'Chờ thanh toán'; desc = 'Đang chờ khách hàng xác nhận.'; Icon = <Clock className="w-6 h-6" />;
                    } else if (selectedOrderDetail.order.status === 'CANCEL' || selectedOrderDetail.order.status === 'FULLY_CANCELLED') {
                      bg = 'bg-white border-rose-100 shadow-rose-50';
                      iconBg = 'bg-rose-50 text-rose-600';
                      title = 'Đã hủy'; desc = 'Đơn hàng này đã bị hủy bỏ.'; Icon = <Ban className="w-6 h-6" />;
                    } else {
                      bg = 'bg-white border-gray-100';
                      iconBg = 'bg-gray-100 text-gray-600';
                      title = selectedOrderDetail.order.status; desc = 'Chi tiết trạng thái đơn hàng.'; Icon = <CreditCard className="w-6 h-6" />;
                    }

                    return (
                      <div className={`rounded-2xl p-6 border shadow-lg transition-all ${bg}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
                          {Icon}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">{title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{desc}</p>
                      </div>
                    )
                  })()}

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-2">Thông tin khách hàng</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Tên khách hàng</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{selectedOrderDetail.order.user?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Email liên hệ</p>
                        <p className="text-sm font-medium text-gray-700 mt-0.5 break-all">{selectedOrderDetail.order.user?.email || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-50 pb-2">Tóm tắt tài chính</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">TỔNG CỘNG</span>
                        <span className="text-lg font-bold text-gray-900">{formatMoney(selectedOrderDetail.order.final_total_price)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Detailed Lists */}
              <div className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-10">
                {/* Bookings Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <CalendarClock className="w-3.5 h-3.5" />
                      Danh sách Booking ({selectedOrderDetail.bookings.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {selectedOrderDetail.bookings.map((booking) => (
                      <div key={booking.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <Boxes className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 uppercase">{booking.pod?.code ?? podMap.get(booking.pod_id)?.code ?? '—'}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{compactId(booking.id)}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${bookingStatusBadgeClass(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="space-y-2 border-t border-gray-50 pt-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Thời gian</span>
                            <span className="font-bold text-gray-700">{dayjs(booking.start_time).format('HH:mm DD/MM')} - {dayjs(booking.end_time).format('HH:mm DD/MM')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Incidents & Damage Bills */}
                <div className="space-y-4 pt-6 border-t border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5" />
                      Sự cố & Đền bù đơn hàng
                    </h4>
                    <button
                      onClick={handleCreateDamageBill}
                      disabled={
                        isCreatingDamageBill ||
                        selectedOrderIncidents.some(i => i.status === 'PENDING') ||
                        selectedOrderIncidents.filter(i => i.status === 'RESOLVED').length === 0 ||
                        isReadOnly ||
                        (selectedOrderDetail.order.damage_payment_status && selectedOrderDetail.order.damage_payment_status !== 'NO_INCIDENT')
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
                    >
                      {isCreatingDamageBill ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <CreditCard className="w-3 h-3" />
                      )}
                      {(selectedOrderDetail.order.damage_payment_status && selectedOrderDetail.order.damage_payment_status !== 'NO_INCIDENT')
                        ? 'Đã tạo hóa đơn đền bù' : 'Tạo hóa đơn đền bù'}
                    </button>
                  </div>

                  {isOrderIncidentsLoading ? (
                    <div className="py-10 text-center text-gray-400 animate-pulse">Đang tải sự cố...</div>
                  ) : selectedOrderIncidents.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl p-10 text-center">
                      <p className="text-sm text-gray-400">Không có sự cố nào ghi nhận trong đơn hàng này.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedOrderIncidents.map(inc => (
                        <div key={inc.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 leading-snug">{inc.description}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md border border-gray-100 uppercase tracking-tight">Pod: {inc.pod_id?.slice(0, 8)}...</span>
                              {inc.items && inc.items.length > 0 && (
                                <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-100 uppercase tracking-tight">
                                  Hư hại: {inc.items.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${incidentStatusBadgeClass(inc.status)}`}>{translateIncidentStatus(inc.status)}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${incidentSeverityBadgeClass(inc.severity)}`}>{translateIncidentSeverity(inc.severity)}</span>
                            </div>
                            {inc.total_amount_value !== undefined && (
                              <span className="text-sm font-bold text-gray-900">{formatMoney(inc.total_amount_value)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
