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
  X,
  CreditCard,
  Ban,
  Boxes,
  AlertCircle
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
  type BookingOrderStatus
} from '../../api/lib/bookingOrderApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { PodGridSelector } from '../../components/common/PodGridSelector'

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

export const BookingManagement = () => {
  const { clusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()

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
  }, [bookingPage, bookingStatusFilter, bookingPodFilter, bookingOrderFilter, bookingStartFilter, bookingEndFilter])

  useEffect(() => {
    fetchOrders(orderPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderPage, orderStatusFilter, orderPodFilter, orderStartFilter, orderEndFilter])

  const handleRefresh = async () => {
    try {
      await refreshScope()
      await Promise.all([fetchPods(), fetchBookings(bookingPage), fetchOrders(orderPage)])
      toast.success('Booking data refreshed')
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

    try {
      const detail = await bookingOrderApi.getById(orderId)
      setSelectedOrderDetail(detail)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load booking order detail')
      setIsOrderDetailOpen(false)
    } finally {
      setIsOrderDetailLoading(false)
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
                                disabled={isUpdating}
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
          <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-100 p-3 mb-6 inline-flex items-center gap-2 text-amber-800 text-sm font-medium">
            <ShieldOff className="w-4 h-4" />
            Owner actions are blocked in manager view
          </div>

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

      {/* Filter panel */}
      <div className={`fixed inset-0 z-50 ${isFilterPanelOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isFilterPanelOpen}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isFilterPanelOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsFilterPanelOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-full max-w-4xl overflow-hidden bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl flex flex-col ${isFilterPanelOpen ? 'translate-x-0' : 'translate-x-[110%]'}`} role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <p className="text-xs text-gray-500 mt-1">Filter {activeTab} by status and pod.</p>
            </div>
            <button type="button" onClick={() => setIsFilterPanelOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

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
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
            {activeTab === 'bookings' ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-3"><label className="block text-sm font-semibold text-gray-900">Status</label></div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setDraftBookingFilters(prev => ({ ...prev, status: toggleArrayFilter(prev.status, 'all', BOOKING_STATUSES.length) }))} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftBookingFilters.status.length === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{draftBookingFilters.status.length === 0 && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}All</button>
                    {BOOKING_STATUSES.map(status => {
                      const isSelected = draftBookingFilters.status.includes(status)
                      return (
                        <button key={status} type="button" onClick={() => setDraftBookingFilters(prev => ({ ...prev, status: toggleArrayFilter(prev.status, status, BOOKING_STATUSES.length) }))} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{isSelected && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}{status}</button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3"><label className="block text-sm font-semibold text-gray-900">Pod</label></div>
                  <PodGridSelector
                    pods={podOptions}
                    selectedPodId={draftBookingFilters.pod_id}
                    onSelect={(id) => setDraftBookingFilters(prev => ({ ...prev, pod_id: toggleArrayFilter(prev.pod_id, id, podOptions.length) }))}
                    showAllOption={true}
                    allOptionLabel="All scoped pods"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3"><label className="block text-sm font-semibold text-gray-900">Date Range (Booking Time)</label></div>
                  <div className="border border-gray-200 rounded-xl shadow-sm bg-white custom-calendar w-full overflow-hidden">
                    <div className="w-full p-4">
                      <DatePicker
                        selected={draftBookingFilters.dateRange[0]}
                        onChange={(update: [Date | null, Date | null]) => setDraftBookingFilters(prev => ({ ...prev, dateRange: update }))}
                        startDate={draftBookingFilters.dateRange[0] || undefined}
                        endDate={draftBookingFilters.dateRange[1] || undefined}
                        selectsRange
                        inline
                        monthsShown={1}
                      />
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                      <button
                        type="button"
                        onClick={() => setDraftBookingFilters(prev => ({ ...prev, dateRange: [null, null] }))}
                        className="text-sm font-semibold text-gray-900 underline hover:text-gray-700 transition"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFilters()}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold transition hover:bg-gray-800"
                      >
                        Apply Date
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-3"><label className="block text-sm font-semibold text-gray-900">Status</label></div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setDraftOrderFilters(prev => ({ ...prev, status: toggleArrayFilter(prev.status, 'all', BOOKING_ORDER_STATUSES.length) }))} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftOrderFilters.status.length === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{draftOrderFilters.status.length === 0 && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}All</button>
                    {BOOKING_ORDER_STATUSES.map(status => {
                      const isSelected = draftOrderFilters.status.includes(status)
                      return (
                        <button key={status} type="button" onClick={() => setDraftOrderFilters(prev => ({ ...prev, status: toggleArrayFilter(prev.status, status, BOOKING_ORDER_STATUSES.length) }))} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{isSelected && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}{status}</button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3"><label className="block text-sm font-semibold text-gray-900">Pod</label></div>
                  <PodGridSelector
                    pods={podOptions}
                    selectedPodId={draftOrderFilters.pod_id}
                    onSelect={(id) => setDraftOrderFilters(prev => ({ ...prev, pod_id: toggleArrayFilter(prev.pod_id, id, podOptions.length) }))}
                    showAllOption={true}
                    allOptionLabel="All pods in scope"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3"><label className="block text-sm font-semibold text-gray-900">Date Range (Order Creation)</label></div>
                  <div className="border border-gray-200 rounded-xl shadow-sm bg-white custom-calendar w-full overflow-hidden">
                    <div className="w-full p-4">
                      <DatePicker
                        selected={draftOrderFilters.dateRange[0]}
                        onChange={(update: [Date | null, Date | null]) => setDraftOrderFilters(prev => ({ ...prev, dateRange: update }))}
                        startDate={draftOrderFilters.dateRange[0] || undefined}
                        endDate={draftOrderFilters.dateRange[1] || undefined}
                        selectsRange
                        inline
                        monthsShown={1}
                      />
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                      <button
                        type="button"
                        onClick={() => setDraftOrderFilters(prev => ({ ...prev, dateRange: [null, null] }))}
                        className="text-sm font-semibold text-gray-900 underline hover:text-gray-700 transition"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFilters()}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold transition hover:bg-gray-800"
                      >
                        Apply Date
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="px-6 py-5 border-t border-gray-100 bg-white flex items-center justify-between gap-3 lg:rounded-b-xl">
            <button type="button" onClick={resetDraftFilters} className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Reset</button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsFilterPanelOpen(false)} className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={applyFilters} className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Apply</button>
            </div>
          </div>
        </div>
      </div>

      <div className={`fixed inset-0 z-50 ${isBookingDetailOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isBookingDetailOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isBookingDetailOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => {
            setIsBookingDetailOpen(false)
            setSelectedBooking(null)
            setIsBookingDetailLoading(false)
          }}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-[960px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl flex flex-col ${isBookingDetailOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Booking Detail</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsBookingDetailOpen(false)
                setSelectedBooking(null)
                setIsBookingDetailLoading(false)
              }}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isBookingDetailLoading ? (
              <div className="py-8 text-center text-gray-500">Loading booking detail...</div>
            ) : !selectedBooking ? (
              <div className="py-8 text-center text-gray-500">No booking data.</div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  let bg = '', iconBg = '', title = '', desc = '', Icon = null;
                  if (selectedBooking.status === 'IN_USE') {
                    bg = 'from-emerald-50/80 to-white border-emerald-100';
                    iconBg = 'bg-white text-emerald-500 shadow-sm border border-emerald-50';
                    title = 'In Use'; desc = 'Booking is currently active.'; Icon = <Clock className="w-6 h-6" />;
                  } else if (selectedBooking.status === 'BOOKED') {
                    bg = 'from-blue-50/80 to-white border-blue-100';
                    iconBg = 'bg-white text-blue-500 shadow-sm border border-blue-50';
                    title = 'Booked'; desc = 'Booking is confirmed and upcoming.'; Icon = <CalendarClock className="w-6 h-6" />;
                  } else if (selectedBooking.status === 'COMPLETED') {
                    bg = 'from-gray-50/80 to-white border-gray-100';
                    iconBg = 'bg-white text-gray-500 shadow-sm border border-gray-50';
                    title = 'Completed'; desc = 'Booking has been fulfilled.'; Icon = <CheckCircle className="w-6 h-6" />;
                  } else if (selectedBooking.status === 'CANCELLED') {
                    bg = 'from-rose-50/80 to-white border-rose-100';
                    iconBg = 'bg-white text-rose-500 shadow-sm border border-rose-50';
                    title = 'Cancelled'; desc = 'Booking has been cancelled.'; Icon = <Ban className="w-6 h-6" />;
                  } else {
                    bg = 'from-gray-50/80 to-white border-gray-100';
                    iconBg = 'bg-white text-gray-500 shadow-sm border border-gray-50';
                    title = selectedBooking.status; desc = 'Booking status pending.'; Icon = <Boxes className="w-6 h-6" />;
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

                {selectedBooking.status === 'COMPLETED' && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-gray-200">
                      <X className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Booking đã hoàn tất, không thể tiếp tục tiếp nhận hành động</p>
                      <p className="text-xs text-gray-500 mt-0.5">Mọi thao tác quản lý đã bị vô hiệu hóa.</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col text-sm">
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Booking ID</span>
                    <span className="font-medium text-gray-900 break-all">{selectedBooking.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Order ID</span>
                    <span className="font-medium text-gray-900 break-all">{selectedBooking.order_id}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Pod ID</span>
                    <span className="font-medium text-gray-900 break-all">{selectedBooking.pod_id}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Start Time</span>
                    <span className="font-medium text-gray-900">{formatDateTime(selectedBooking.start_time)}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">End Time</span>
                    <span className="font-medium text-gray-900">{formatDateTime(selectedBooking.end_time)}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Checkin State</span>
                    <span className="font-medium text-gray-900">{selectedBooking.checkin_state ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Cleaner Access</span>
                    <span className="font-medium text-gray-900">{selectedBooking.cleaner_access_allowed ? 'Allowed' : 'Disabled'}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Base Price</span>
                    <span className="font-medium text-gray-900">{formatMoney(selectedBooking.base_price)}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Total Price</span>
                    <span className="font-medium text-gray-900">{formatMoney(selectedBooking.total_price)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

      <div className={`fixed inset-0 z-50 ${isOrderDetailOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOrderDetailOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOrderDetailOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => {
            setIsOrderDetailOpen(false)
            setSelectedOrderDetail(null)
            setIsOrderDetailLoading(false)
          }}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-[960px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl flex flex-col ${isOrderDetailOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Booking Order Detail</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOrderDetailOpen(false)
                setSelectedOrderDetail(null)
                setIsOrderDetailLoading(false)
              }}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isOrderDetailLoading ? (
              <div className="py-8 text-center text-gray-500">Loading booking order detail...</div>
            ) : !selectedOrderDetail ? (
              <div className="py-8 text-center text-gray-500">No booking order data.</div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  let bg = '', iconBg = '', title = '', desc = '', Icon = null;
                  if (selectedOrderDetail.order.status === 'PAID') {
                    bg = 'from-emerald-50/80 to-white border-emerald-100';
                    iconBg = 'bg-white text-emerald-500 shadow-sm border border-emerald-50';
                    title = 'Order Paid'; desc = 'Payment successful.'; Icon = <CheckCircle className="w-6 h-6" />;
                  } else if (selectedOrderDetail.order.status === 'PENDING') {
                    bg = 'from-amber-50/80 to-white border-amber-100';
                    iconBg = 'bg-white text-amber-500 shadow-sm border border-amber-50';
                    title = 'Payment Pending'; desc = 'Awaiting customer payment.'; Icon = <Clock className="w-6 h-6" />;
                  } else if (selectedOrderDetail.order.status === 'CANCEL' || selectedOrderDetail.order.status === 'FULLY_CANCELLED') {
                    bg = 'from-rose-50/80 to-white border-rose-100';
                    iconBg = 'bg-white text-rose-500 shadow-sm border border-rose-50';
                    title = 'Order Cancelled'; desc = 'The order has been cancelled.'; Icon = <Ban className="w-6 h-6" />;
                  } else {
                    bg = 'from-gray-50/80 to-white border-gray-100';
                    iconBg = 'bg-white text-gray-500 shadow-sm border border-gray-50';
                    title = selectedOrderDetail.order.status; desc = 'Order status details.'; Icon = <CreditCard className="w-6 h-6" />;
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

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-sm flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-amber-200">
                    <ShieldOff className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Owner actions are blocked for manager view</h4>
                    <p className="text-amber-700/80">Cancel, checkout and repay are owner-only flows. This screen is for monitoring and detail tracking.</p>
                  </div>
                </div>

                <div className="flex flex-col text-sm">
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Order ID</span>
                    <span className="font-medium text-gray-900 break-all">{selectedOrderDetail.order.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">User Name</span>
                    <span className="font-medium text-gray-900">{selectedOrderDetail.order.user?.name || 'Unknown User'}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">User Email</span>
                    <span className="font-medium text-gray-900">{selectedOrderDetail.order.user?.email || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Final Total</span>
                    <span className="font-medium text-gray-900">{formatMoney(selectedOrderDetail.order.final_total_price)}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Bookings in this order</h3>
                  {selectedOrderDetail.bookings.length === 0 ? (
                    <p className="text-sm text-gray-500">No bookings visible in your manager scope.</p>
                  ) : (
                    <div className="space-y-3 max-h-[42vh] overflow-auto pr-1">
                      {selectedOrderDetail.bookings.map((booking) => (
                        <div key={booking.id} className="border border-gray-200 rounded-lg p-3 text-sm flex items-center justify-between">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Pod</p>
                              <p className="font-medium text-gray-900">{booking.pod?.code ?? podMap.get(booking.pod_id)?.code ?? compactId(booking.pod_id)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Start Time</p>
                              <p className="font-medium text-gray-900">{formatDateTime(booking.start_time)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">End Time</p>
                              <p className="font-medium text-gray-900">{formatDateTime(booking.end_time)}</p>
                            </div>
                          </div>
                          <div className="ml-4 flex items-center justify-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bookingStatusBadgeClass(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button type="button" disabled className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed">Cancel (Owner only)</button>
                  <button type="button" disabled className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed">Checkout (Owner only)</button>
                  <button type="button" disabled className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed">Repay (Owner only)</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
