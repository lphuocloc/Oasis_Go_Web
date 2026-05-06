import { useEffect, useMemo, useState, Fragment } from 'react'
import { Search, RefreshCw, Eye, Sparkles, X, ChevronDown, ChevronUp, Image as ImageIcon, Video, Clock, AlertCircle, Calendar, Hash } from 'lucide-react'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import Modal from '../../components/common/Modal'
import {
  cleaningTaskApi,
  type CleaningTaskItem,
  type CleaningTaskStatus,
  type CleaningTaskWithMediaPayload,
  type CleaningTaskManagerBookingItem
} from '../../api/lib/cleaningTaskApi'
import { bookingApi, type BookingItem, type BookingPagination } from '../../api/lib/bookingApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { initUserSocket } from '../../lib/socket'

const bookingStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'BOOKED': return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'IN_USE': return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'CANCELLED': return 'bg-rose-50 text-rose-700 border border-rose-200'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const taskStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'DONE': return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
    case 'IN_PROGRESS':
    case 'ARRIVED': return 'bg-amber-50 text-amber-700 border border-amber-100'
    case 'CANCELLED':
    case 'MISSED': return 'bg-rose-50 text-rose-700 border border-rose-100'
    default: return 'bg-blue-50 text-blue-700 border border-blue-100'
  }
}

const translateBookingStatus = (status: string) => {
  switch (status) {
    case 'BOOKED': return 'Đã đặt'
    case 'IN_USE': return 'Đang sử dụng'
    case 'COMPLETED': return 'Hoàn tất'
    case 'CANCELLED': return 'Đã hủy'
    default: return status
  }
}

const translateTaskStatus = (status: string) => {
  switch (status) {
    case 'ASSIGNED': return 'Đã gán'
    case 'NOTIFIED': return 'Đã thông báo'
    case 'ACCEPTED': return 'Đã chấp nhận'
    case 'ARRIVED': return 'Đã đến'
    case 'IN_PROGRESS': return 'Đang làm'
    case 'DONE': return 'Xong'
    case 'CANCELLED': return 'Hủy'
    case 'MISSED': return 'Lỡ'
    default: return status
  }
}

export const CleaningTaskManagement = () => {
  const { clusters, refreshScope } = useManagerScope()
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [pagination, setPagination] = useState<BookingPagination | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  const [bookingTasks, setBookingTasks] = useState<CleaningTaskManagerBookingItem[]>([])
  const [isTasksLoading, setIsTasksLoading] = useState(false)
  
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<CleaningTaskWithMediaPayload | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchBookings = async (page = currentPage) => {
    try {
      setIsLoading(true)
      const res = await bookingApi.getAll({ 
        page, 
        limit: 10,
        pod_id: search.trim() ? search.trim() : undefined
      })
      
      setBookings(res.bookings || [])
      setPagination(res.pagination || null)
    } catch (err: any) {
      toast.error('Không thể tải danh sách đặt chỗ')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTasksForBooking = async (bookingId: string) => {
    try {
      setIsTasksLoading(true)
      const res = await cleaningTaskApi.getManagerCleanerBooking({ booking_id: bookingId })
      setBookingTasks(res.data || [])
    } catch (err: any) {
      toast.error('Không thể tải danh sách nhiệm vụ của đặt chỗ này')
    } finally {
      setIsTasksLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings(currentPage)
  }, [clusters, currentPage, refreshTrigger])

  useEffect(() => {
    if (expandedBookingId) {
      fetchTasksForBooking(expandedBookingId)
    } else {
      setBookingTasks([])
    }
  }, [expandedBookingId])

  useEffect(() => {
    const socket = initUserSocket()
    if (!socket) return
    const handleRefresh = () => setRefreshTrigger(prev => prev + 1)
    socket.on('cleaning-task:update', handleRefresh)
    socket.on('dashboard:refresh', handleRefresh)
    return () => {
      socket.off('cleaning-task:update', handleRefresh)
      socket.off('dashboard:refresh', handleRefresh)
    }
  }, [])

  const openDetail = async (taskId: string) => {
    try {
      setIsDetailLoading(true)
      setIsDetailOpen(true)
      const res = await cleaningTaskApi.getWithMedia(taskId)
      setDetailData(res.data)
    } catch (err: any) {
      toast.error('Không thể tải minh chứng của nhiệm vụ')
      setIsDetailOpen(false)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedBookingId(prev => prev === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="text-purple-600 h-8 w-8" />
            Nhiệm vụ Vệ sinh theo Booking
          </h1>
          <p className="text-gray-500 mt-1">Giám sát các đầu việc dọn dẹp tương ứng với từng mã đặt chỗ.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã phòng (Pod ID)..."
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl w-64 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchBookings(1)}
            />
          </div>
          <button
            onClick={() => { refreshScope(); setRefreshTrigger(p => p + 1) }}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm">Mã Booking</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm">Pod / Cluster</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm text-center">Thời gian sử dụng</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm text-center">Trạng thái</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-sm text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-gray-100 rounded w-full" /></td>
                </tr>
              ))
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  Không tìm thấy booking nào trong khu vực của bạn
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <Fragment key={booking.id}>
                  <tr className={`group transition-all ${expandedBookingId === booking.id ? 'bg-purple-50/30' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-300" />
                        <span className="font-mono font-bold text-gray-900 tracking-tight">{booking.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900">{booking.pod?.name || booking.pod?.code || booking.pod_id}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{clusters.find(c => c.id === booking.pod?.cluster_id)?.name || '—'}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <p className="text-xs font-medium text-gray-700">{dayjs(booking.start_time).format('DD/MM HH:mm')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">đến {dayjs(booking.end_time).format('DD/MM HH:mm')}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${bookingStatusBadgeClass(booking.status)}`}>
                        {translateBookingStatus(booking.status)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => toggleExpand(booking.id)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          expandedBookingId === booking.id
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-100'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {expandedBookingId === booking.id ? (
                          <>Đóng <ChevronUp className="h-4 w-4" /></>
                        ) : (
                          <>Nhiệm vụ <ChevronDown className="h-4 w-4" /></>
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Content: Tasks */}
                  {expandedBookingId === booking.id && (
                    <tr className="bg-purple-50/20 border-b border-purple-50">
                      <td colSpan={5} className="px-12 py-6">
                        <div className="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                            <h4 className="text-[11px] font-bold text-purple-600 uppercase tracking-widest italic flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5" />
                              Các tác vụ dọn dẹp cho Booking #{booking.id}
                            </h4>
                            <span className="text-[10px] text-gray-400 font-medium">Tìm thấy {bookingTasks.length} nhiệm vụ</span>
                          </div>

                          <div className="divide-y divide-gray-50">
                            {isTasksLoading ? (
                              <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-2">
                                <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
                                <p className="text-xs font-medium italic">Đang tải danh sách tác vụ...</p>
                              </div>
                            ) : bookingTasks.length === 0 ? (
                              <div className="p-8 text-center text-gray-400 italic text-xs">
                                Chưa có nhiệm vụ vệ sinh nào được tạo cho booking này
                              </div>
                            ) : (
                              bookingTasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors group">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${task.status === 'DONE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                                    <div>
                                      <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        #{task.id.slice(-6).toUpperCase()}
                                        <span className="text-[10px] font-medium text-gray-400 font-mono">({task.id})</span>
                                      </p>
                                      <div className="flex items-center gap-3 mt-0.5">
                                        <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          Hạn: {task.due_at ? dayjs(task.due_at).format('HH:mm DD/MM') : '-'}
                                        </p>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold uppercase tracking-tighter">
                                          Nguồn: {task.request_source === 'USER_REQUEST' ? 'Khách' : 'Hệ thống'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${taskStatusBadgeClass(task.status)}`}>
                                      {translateTaskStatus(task.status)}
                                    </span>
                                    <button
                                      onClick={() => openDetail(task.id)}
                                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                      title="Xem minh chứng"
                                    >
                                      <Eye className="h-4.5 w-4.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Hiển thị <span className="font-bold text-gray-900">{(currentPage - 1) * 10 + 1}</span> - <span className="font-bold text-gray-900">{Math.min(currentPage * 10, pagination.total_items)}</span> trên <span className="font-bold text-gray-900">{pagination.total_items}</span> booking
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                Trước
              </button>
              <span className="text-xs font-bold text-gray-900 px-3">{currentPage} / {pagination.total_pages}</span>
              <button
                disabled={currentPage === pagination.total_pages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Media Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Minh chứng Nhiệm vụ Vệ sinh"
        size="lg"
      >
        {isDetailLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="h-10 w-10 animate-spin text-purple-500" />
            <p className="text-gray-500 font-medium animate-pulse italic">Đang tải minh chứng từ hệ thống...</p>
          </div>
        ) : detailData ? (
          <div className="space-y-8">
             {/* Task Status Summary */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Trạng thái</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${taskStatusBadgeClass(detailData.task.status)}`}>
                  {translateTaskStatus(detailData.task.status)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Bắt đầu lúc</p>
                <p className="text-sm font-bold text-gray-900">{detailData.task.actual_start_time ? dayjs(detailData.task.actual_start_time).format('HH:mm DD/MM') : '-'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Hoàn tất lúc</p>
                <p className="text-sm font-bold text-gray-900">{detailData.task.actual_end_time ? dayjs(detailData.task.actual_end_time).format('HH:mm DD/MM') : '-'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Tên Pod</p>
                <p className="text-sm font-bold text-gray-900">{detailData.task.pod_name || detailData.task.pod_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Before */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-4 bg-amber-400 rounded-full" />
                  Ảnh/Video TRƯỚC khi dọn
                </h3>
                {detailData.media.before.length === 0 ? (
                  <div className="aspect-video rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs">Không có dữ liệu minh chứng</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {detailData.media.before.map(m => (
                      <div key={m.id} className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black">
                        {m.file_type === 'VIDEO' ? (
                          <video src={m.media.url} className="w-full h-full object-contain" controls />
                        ) : (
                          <img src={m.media.url} alt="Before" className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                        )}
                        <div className="absolute top-2 right-2 p-1 bg-black/50 backdrop-blur-md rounded-lg">
                          {m.file_type === 'VIDEO' ? <Video className="h-3 w-3 text-white" /> : <ImageIcon className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* After */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-4 bg-emerald-400 rounded-full" />
                  Ảnh/Video SAU khi hoàn tất
                </h3>
                {detailData.media.after.length === 0 ? (
                  <div className="aspect-video rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                    <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs">Không có dữ liệu minh chứng</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {detailData.media.after.map(m => (
                      <div key={m.id} className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black">
                        {m.file_type === 'VIDEO' ? (
                          <video src={m.media.url} className="w-full h-full object-contain" controls />
                        ) : (
                          <img src={m.media.url} alt="After" className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                        )}
                        <div className="absolute top-2 right-2 p-1 bg-black/50 backdrop-blur-md rounded-lg">
                          {m.file_type === 'VIDEO' ? <Video className="h-3 w-3 text-white" /> : <ImageIcon className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
