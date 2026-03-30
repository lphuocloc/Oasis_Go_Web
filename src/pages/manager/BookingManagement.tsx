import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  ClipboardList,
  Eye,
  RefreshCw,
  Search,
  Shield,
  ShieldOff
} from 'lucide-react'
import { DatePicker } from 'antd'
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

export const BookingManagement = () => {
  const { clusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()

  const [activeTab, setActiveTab] = useState<ActiveTab>('bookings')
  const [pods, setPods] = useState<PodItem[]>([])
  const [isPodsLoading, setIsPodsLoading] = useState(false)

  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [isBookingsLoading, setIsBookingsLoading] = useState(true)
  const [bookingPage, setBookingPage] = useState(1)
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | BookingStatus>('all')
  const [bookingPodFilter, setBookingPodFilter] = useState('all')
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
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | BookingOrderStatus>('all')
  const [orderPodFilter, setOrderPodFilter] = useState('all')
  const [orderPagination, setOrderPagination] = useState<BookingOrderPagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
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

  const podOptions = useMemo(
    () => [...scopedPods].sort((a, b) => (a.code || '').localeCompare(b.code || '')),
    [scopedPods]
  )

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
        limit: 20,
        status: bookingStatusFilter === 'all' ? undefined : bookingStatusFilter,
        pod_id: bookingPodFilter === 'all' ? undefined : bookingPodFilter,
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
      const response = await bookingOrderApi.getAll({
        page,
        limit: 20,
        status: orderStatusFilter === 'all' ? undefined : orderStatusFilter,
        pod_ids: orderPodFilter === 'all' ? undefined : orderPodFilter
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
  }, [orderPage, orderStatusFilter, orderPodFilter])

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

  const bookingStats = useMemo(() => {
    const byStatus = bookings.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1
      return acc
    }, {})

    return {
      total: bookingPagination.total_items,
      inUse: byStatus.IN_USE ?? 0,
      booked: byStatus.BOOKED ?? 0,
      completed: byStatus.COMPLETED ?? 0
    }
  }, [bookings, bookingPagination.total_items])

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{bookingStats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">IN_USE</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{bookingStats.inUse}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">BOOKED</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">{bookingStats.booked}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Booking Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{orderPagination.total}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-1 mb-6 inline-flex">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'bookings' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => setActiveTab('bookings')}
        >
          <span className="inline-flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Bookings
          </span>
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'orders' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr_1fr] gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={bookingOrderFilter}
                  onChange={(e) => {
                    setBookingPage(1)
                    setBookingOrderFilter(e.target.value)
                  }}
                  placeholder="Filter by order id..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={bookingPodFilter}
                onChange={(e) => {
                  setBookingPage(1)
                  setBookingPodFilter(e.target.value)
                }}
                disabled={isPodsLoading}
                className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All scoped pods</option>
                {podOptions.map((pod) => (
                  <option key={pod.id} value={pod.id}>{pod.code} - {pod.name}</option>
                ))}
              </select>

              <select
                value={bookingStatusFilter}
                onChange={(e) => {
                  setBookingPage(1)
                  setBookingStatusFilter(e.target.value as 'all' | BookingStatus)
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All statuses</option>
                {BOOKING_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                value={bookingStartFilter ? dayjs(bookingStartFilter) : null}
                onChange={(value) => {
                  setBookingPage(1)
                  setBookingStartFilter(value ? value.format('YYYY-MM-DDTHH:mm') : '')
                }}
                className="w-full"
              />

              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                value={bookingEndFilter ? dayjs(bookingEndFilter) : null}
                onChange={(value) => {
                  setBookingPage(1)
                  setBookingEndFilter(value ? value.format('YYYY-MM-DDTHH:mm') : '')
                }}
                className="w-full"
              />
            </div>
          </div>

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
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  booking.cleaner_access_allowed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_0.5fr] gap-4">
              <select
                value={orderPodFilter}
                onChange={(e) => {
                  setOrderPage(1)
                  setOrderPodFilter(e.target.value)
                }}
                disabled={isPodsLoading}
                className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All pods in scope</option>
                {podOptions.map((pod) => (
                  <option key={pod.id} value={pod.id}>{pod.code} - {pod.name}</option>
                ))}
              </select>

              <select
                value={orderStatusFilter}
                onChange={(e) => {
                  setOrderPage(1)
                  setOrderStatusFilter(e.target.value as 'all' | BookingOrderStatus)
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All statuses</option>
                {BOOKING_ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <div className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium">
                <ShieldOff className="w-4 h-4" />
                Owner actions blocked
              </div>
            </div>
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
                        <td className="px-6 py-4 align-top text-gray-700">{compactId(order.user_id)}</td>
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
        isOpen={isBookingDetailOpen}
        onClose={() => {
          setIsBookingDetailOpen(false)
          setSelectedBooking(null)
          setIsBookingDetailLoading(false)
        }}
        title="Booking Detail"
        size="xl"
      >
        {isBookingDetailLoading ? (
          <div className="py-8 text-center text-gray-500">Loading booking detail...</div>
        ) : !selectedBooking ? (
          <div className="py-8 text-center text-gray-500">No booking data.</div>
        ) : (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Booking ID</p>
                <p className="font-medium text-gray-900 break-all">{selectedBooking.id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Order ID</p>
                <p className="font-medium text-gray-900 break-all">{selectedBooking.order_id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Pod ID</p>
                <p className="font-medium text-gray-900 break-all">{selectedBooking.pod_id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bookingStatusBadgeClass(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Start Time</p>
                <p className="font-medium text-gray-900">{formatDateTime(selectedBooking.start_time)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">End Time</p>
                <p className="font-medium text-gray-900">{formatDateTime(selectedBooking.end_time)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Checkin State</p>
                <p className="font-medium text-gray-900">{selectedBooking.checkin_state ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Cleaner Access</p>
                <p className="font-medium text-gray-900">{selectedBooking.cleaner_access_allowed ? 'Allowed' : 'Disabled'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Base Price</p>
                <p className="font-medium text-gray-900">{formatMoney(selectedBooking.base_price)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Total Price</p>
                <p className="font-medium text-gray-900">{formatMoney(selectedBooking.total_price)}</p>
              </div>
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
        title="Booking Order Detail"
        size="xl"
      >
        {isOrderDetailLoading ? (
          <div className="py-8 text-center text-gray-500">Loading booking order detail...</div>
        ) : !selectedOrderDetail ? (
          <div className="py-8 text-center text-gray-500">No booking order data.</div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-sm">
              <div className="inline-flex items-center gap-2 font-semibold mb-1">
                <ShieldOff className="w-4 h-4" />
                Owner actions are blocked for manager view
              </div>
              <p>Cancel, checkout and repay are owner-only flows. This screen is for monitoring and detail tracking.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Order ID</p>
                <p className="font-medium text-gray-900 break-all">{selectedOrderDetail.order.id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">User ID</p>
                <p className="font-medium text-gray-900 break-all">{selectedOrderDetail.order.user_id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${orderStatusBadgeClass(selectedOrderDetail.order.status)}`}>
                  {selectedOrderDetail.order.status}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Final Total</p>
                <p className="font-medium text-gray-900">{formatMoney(selectedOrderDetail.order.final_total_price)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Bookings in this order</h3>
              {selectedOrderDetail.bookings.length === 0 ? (
                <p className="text-sm text-gray-500">No bookings visible in your manager scope.</p>
              ) : (
                <div className="space-y-3 max-h-[42vh] overflow-auto pr-1">
                  {selectedOrderDetail.bookings.map((booking) => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-gray-900">{compactId(booking.id)}</p>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${bookingStatusBadgeClass(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-gray-600">
                        <p>Pod: {booking.pod?.code ?? podMap.get(booking.pod_id)?.code ?? compactId(booking.pod_id)}</p>
                        <p>Start: {formatDateTime(booking.start_time)}</p>
                        <p>End: {formatDateTime(booking.end_time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                disabled
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                title="Only owner can cancel order"
              >
                Cancel (Owner only)
              </button>
              <button
                type="button"
                disabled
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                title="Only owner can checkout order"
              >
                Checkout (Owner only)
              </button>
              <button
                type="button"
                disabled
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                title="Only owner can repay order"
              >
                Repay (Owner only)
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
