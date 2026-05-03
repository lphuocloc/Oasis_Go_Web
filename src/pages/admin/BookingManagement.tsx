/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import {
  Eye,
  RefreshCw,
  Search,
  SlidersHorizontal,
  CreditCard,
  MapPin,
  Layout
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
  bookingOrderApi,
  type BookingOrderDetail,
  type BookingOrderItem,
  type BookingOrderPagination,
  type BookingOrderStatus
} from '../../api/lib/bookingOrderApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { podClusterApi, type PodClusterItem } from '../../api/lib/podClusterApi'
import { locationApi, type LocationItem } from '../../api/lib/locationApi'

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
    case 'BOOKED': return 'bg-blue-50 text-blue-700'
    case 'IN_USE': return 'bg-emerald-50 text-emerald-700'
    case 'COMPLETED': return 'bg-gray-100 text-gray-700'
    case 'CANCELLED': return 'bg-rose-50 text-rose-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

const orderStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'PAID': return 'bg-emerald-50 text-emerald-700'
    case 'PENDING': return 'bg-amber-50 text-amber-700'
    case 'PARTIAL_CANCEL': return 'bg-orange-50 text-orange-700'
    case 'FULLY_CANCELLED':
    case 'CANCEL': return 'bg-rose-50 text-rose-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}


export const BookingManagement = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('bookings')

  // Data states
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [clusters, setClusters] = useState<PodClusterItem[]>([])
  const [pods, setPods] = useState<PodItem[]>([])

  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [isBookingsLoading, setIsBookingsLoading] = useState(true)
  const [bookingPage, setBookingPage] = useState(1)
  const [bookingPagination, setBookingPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 20
  })

  const [orders, setOrders] = useState<BookingOrderItem[]>([])
  const [, setIsOrdersLoading] = useState(true)
  const [orderPage, setOrderPage] = useState(1)
  const [orderPagination, setOrderPagination] = useState<BookingOrderPagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  })

  // Filters
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus[]>([])
  const [bookingPodFilter, setBookingPodFilter] = useState<string[]>([])
  const [bookingOrderFilter, setBookingOrderFilter] = useState('')
  const [bookingStartFilter, setBookingStartFilter] = useState('')
  const [bookingEndFilter, setBookingEndFilter] = useState('')

  const [orderStatusFilter] = useState<BookingOrderStatus[]>([])
  const [orderPodFilter] = useState<string[]>([])
  const [orderStartFilter] = useState('')
  const [orderEndFilter] = useState('')

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

  const [isBookingDetailOpen, setIsBookingDetailOpen] = useState(false)
  const [isBookingDetailLoading, setIsBookingDetailLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null)

  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false)
  const [isOrderDetailLoading, setIsOrderDetailLoading] = useState(false)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<BookingOrderDetail | null>(null)

  const podMap = useMemo(() => new Map(pods.map((p) => [p.id, p])), [pods])
  const clusterMap = useMemo(() => new Map(clusters.map((c) => [c.id, c])), [clusters])
  const locationMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations])

  // Initial data fetch
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [locRes, cluRes, podRes] = await Promise.all([
          locationApi.getAll(),
          podClusterApi.getAll(),
          podApi.getAll()
        ])
        setLocations(locRes.data)
        setClusters(cluRes.data)
        setPods(podRes.data)
      } catch (error) {
        console.error('Failed to fetch metadata', error)
      }
    }
    fetchMetadata()
  }, [])

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
      if (response.pagination) {
        setBookingPagination(response.pagination)
      }
    } catch (error: any) {
      toast.error('Không thể tải danh sách booking')
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
      toast.error('Không thể tải danh sách đơn hàng')
    } finally {
      setIsOrdersLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings(bookingPage)
  }, [bookingPage, bookingStatusFilter, bookingPodFilter, bookingOrderFilter, bookingStartFilter, bookingEndFilter, refreshTrigger])

  useEffect(() => {
    fetchOrders(orderPage)
  }, [orderPage, orderStatusFilter, orderPodFilter, orderStartFilter, orderEndFilter, refreshTrigger])

  const openBookingDetail = async (id: string) => {
    setIsBookingDetailOpen(true)
    setIsBookingDetailLoading(true)
    try {
      const data = await bookingApi.getById(id)
      setSelectedBooking(data)
    } catch (error) {
      toast.error('Lỗi khi tải chi tiết booking')
      setIsBookingDetailOpen(false)
    } finally {
      setIsBookingDetailLoading(false)
    }
  }

  const openOrderDetail = async (id: string) => {
    setIsOrderDetailOpen(true)
    setIsOrderDetailLoading(true)
    try {
      const data = await bookingOrderApi.getById(id)
      setSelectedOrderDetail(data)
    } catch (error) {
      toast.error('Lỗi khi tải chi tiết đơn hàng')
      setIsOrderDetailOpen(false)
    } finally {
      setIsOrderDetailLoading(false)
    }
  }

  const applyFilters = () => {
    if (activeTab === 'bookings') {
      setBookingStatusFilter(draftBookingFilters.status)
      setBookingPodFilter(draftBookingFilters.pod_id)
      setBookingStartFilter(draftBookingFilters.dateRange[0] ? dayjs(draftBookingFilters.dateRange[0]).format('YYYY-MM-DDTHH:mm') : '')
      setBookingEndFilter(draftBookingFilters.dateRange[1] ? dayjs(draftBookingFilters.dateRange[1]).format('YYYY-MM-DDTHH:mm') : '')
      setBookingPage(1)
    }
    setIsFilterPanelOpen(false)
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Quản Lý Booking Hệ Thống
          </h1>
          <p className="text-gray-500 mt-1">Theo dõi toàn bộ lịch sử đặt phòng và giao dịch trên toàn hệ thống.</p>
        </div>
        <button
          onClick={() => setRefreshTrigger(p => p + 1)}
          className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-all"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${isBookingsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col xl:flex-row gap-6 items-start xl:items-center">
        <div className="flex gap-4">
          <div className={`px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all ${activeTab === 'bookings' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setActiveTab('bookings')}>
            Danh sách Booking
          </div>
          <div className={`px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setActiveTab('orders')}>
            Đơn hàng (Orders)
          </div>
        </div>
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm nhanh theo mã ID..."
            value={bookingOrderFilter}
            onChange={(e) => setBookingOrderFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => setIsFilterPanelOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Bộ lọc nâng cao
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4">Mã Booking</th>
              <th className="px-6 py-4">Khu vực / Pod</th>
              <th className="px-6 py-4">Thời gian sử dụng</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isBookingsLoading ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400 animate-pulse">Đang tải dữ liệu...</td></tr>
            ) : (activeTab === 'bookings' ? (bookings as any[]) : (orders as any[])).map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{compactId(item.id)}</div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.id}</div>
                </td>
                <td className="px-6 py-4">
                  {activeTab === 'bookings' ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold mb-1">
                        <MapPin className="w-3 h-3" />
                        {locationMap.get(clusterMap.get(item.cluster_id)?.location_id || '')?.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                        <Layout className="w-3 h-3" />
                        {podMap.get(item.pod_id)?.code || 'N/A'} - {clusterMap.get(item.cluster_id)?.name}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-600 text-xs italic">Xem chi tiết đơn hàng</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-gray-700 font-medium">
                    {formatDateTime(activeTab === 'bookings' ? item.start_time : item.created_at)}
                  </div>
                  {activeTab === 'bookings' && (
                    <div className="text-[10px] text-gray-400 mt-0.5">đến {formatDateTime(item.end_time)}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm ${activeTab === 'bookings' ? bookingStatusBadgeClass(item.status) : orderStatusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => activeTab === 'bookings' ? openBookingDetail(item.id) : openOrderDetail(item.id)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-xs font-medium text-gray-500">
            Hiển thị trang {activeTab === 'bookings' ? bookingPagination.current_page : orderPagination.page} / {activeTab === 'bookings' ? bookingPagination.total_pages : orderPagination.pages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={activeTab === 'bookings' ? bookingPagination.current_page <= 1 : orderPagination.page <= 1}
              onClick={() => activeTab === 'bookings' ? setBookingPage(p => p - 1) : setOrderPage(p => p - 1)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Trước
            </button>
            <button
              disabled={activeTab === 'bookings' ? bookingPagination.current_page >= bookingPagination.total_pages : orderPagination.page >= orderPagination.pages}
              onClick={() => activeTab === 'bookings' ? setBookingPage(p => p + 1) : setOrderPage(p => p + 1)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Booking Detail Modal */}
      <Modal isOpen={isBookingDetailOpen} onClose={() => setIsBookingDetailOpen(false)} title="Chi Tiết Booking">
        {isBookingDetailLoading ? (
          <div className="p-12 text-center text-gray-400 italic">Đang tải...</div>
        ) : selectedBooking && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Thời gian đặt</label>
                <div className="text-sm font-semibold text-gray-800">{formatDateTime(selectedBooking.start_time)}</div>
                <div className="text-xs text-gray-500 mt-0.5">đến {formatDateTime(selectedBooking.end_time)}</div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Trạng thái</label>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${bookingStatusBadgeClass(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Mã đơn hàng liên kết</div>
                <div className="text-sm font-mono font-bold text-indigo-600">{selectedBooking.order_id}</div>
              </div>
              <CreditCard className="w-5 h-5 text-gray-300" />
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-3">Dịch vụ bổ sung</h4>
              {(selectedBooking as any).services && (selectedBooking as any).services.length > 0 ? (
                <div className="space-y-2">
                  {(selectedBooking as any).services.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{s.name} x{s.quantity}</span>
                      <span className="font-bold text-gray-900">{formatMoney(s.price * s.quantity)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 italic">Không sử dụng thêm dịch vụ</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* Order Detail Modal */}
      <Modal isOpen={isOrderDetailOpen} onClose={() => setIsOrderDetailOpen(false)} title="Chi Tiết Đơn Hàng">
        {isOrderDetailLoading ? (
          <div className="p-12 text-center text-gray-400 italic">Đang tải...</div>
        ) : selectedOrderDetail && (
          <div className="p-6 space-y-6">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-inner">
              <div className="text-indigo-200 text-xs mb-1">Tổng cộng đơn hàng</div>
              <div className="text-4xl font-bold">{formatMoney(selectedOrderDetail.order.final_total_price)}</div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Danh sách các booking ({selectedOrderDetail.bookings?.length})</h4>
              <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {selectedOrderDetail.bookings?.map((b: any) => (
                  <div key={b.id} className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-900">{compactId(b.id)}</div>
                      <div className="text-[10px] text-gray-500">{formatDateTime(b.start_time)}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${bookingStatusBadgeClass(b.status)}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Filter Modal */}
      <Modal isOpen={isFilterPanelOpen} onClose={() => setIsFilterPanelOpen(false)} title="Bộ Lọc Nâng Cao">
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase">Trạng thái booking</label>
            <div className="flex flex-wrap gap-2">
              {BOOKING_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setDraftBookingFilters(prev => ({ ...prev, status: prev.status.includes(s) ? prev.status.filter(x => x !== s) : [...prev.status, s] }))}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${draftBookingFilters.status.includes(s) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase">Khoảng thời gian</label>
            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                selected={draftBookingFilters.dateRange[0]}
                onChange={(date: Date | null) => setDraftBookingFilters(prev => ({ ...prev, dateRange: [date, prev.dateRange[1]] }))}
                placeholderText="Từ ngày"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <DatePicker
                selected={draftBookingFilters.dateRange[1]}
                onChange={(date: Date | null) => setDraftBookingFilters(prev => ({ ...prev, dateRange: [prev.dateRange[0], date] }))}
                placeholderText="Đến ngày"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => setIsFilterPanelOpen(false)} className="px-6 py-2.5 text-xs font-bold text-gray-400 hover:text-gray-600">Hủy</button>
            <button onClick={applyFilters} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-all">Áp dụng</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
