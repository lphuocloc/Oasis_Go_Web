import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Boxes,
  CheckCircle,
  Eye,
  Handshake,
  Plus,
  RefreshCw,
  Search,
  Store,
  Upload,
  History,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import SlidePanel from '../../components/common/SlidePanel'
import {
  LOST_FOUND_STATUSES,
  LOST_ITEM_REQUEST_STATUSES,
  lostFoundApi,
  type LostFoundItem,
  type LostFoundStatus,
  type LostItemRequest,
  type LostItemRequestStatus
} from '../../api/lib/lostFoundApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { warehouseApi, type WarehouseItem } from '../../api/lib/warehouseApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { initUserSocket } from '../../lib/socket'

const statusBadgeClass = (status: LostFoundStatus) => {
  switch (status) {
    case 'FOUND':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'IN_STORAGE':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'CLAIM_PENDING':
      return 'bg-purple-50 text-purple-700 border border-purple-200'
    case 'RETURNED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'DISPOSED':
      return 'bg-gray-100 text-gray-700 border border-gray-300'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

const requestStatusBadgeClass = (status: LostItemRequestStatus) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'MATCHED':
      return 'bg-purple-50 text-purple-700 border border-purple-200'
    case 'CLOSED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'REJECTED':
      return 'bg-red-50 text-red-700 border border-red-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

const translateStatus = (status: LostFoundStatus) => {
  switch (status) {
    case 'FOUND': return 'Vừa nhặt được'
    case 'IN_STORAGE': return 'Đã cất kho'
    case 'CLAIM_PENDING': return 'Chờ nhận'
    case 'RETURNED': return 'Đã bàn giao'
    case 'DISPOSED': return 'Đã thanh lý'
    default: return status
  }
}

const translateRequestStatus = (status: LostItemRequestStatus) => {
  switch (status) {
    case 'PENDING': return 'Đang chờ'
    case 'MATCHED': return 'Đã khớp đồ'
    case 'CLOSED': return 'Đã đóng'
    case 'REJECTED': return 'Đã từ chối'
    default: return status
  }
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('vi-VN')
}

type TabType = 'ITEMS' | 'REQUESTS'

export const LostAndFoundManagement = () => {
  const { clusters } = useManagerScope()

  const [activeTab, setActiveTab] = useState<TabType>('ITEMS')
  const [items, setItems] = useState<LostFoundItem[]>([])
  const [requests, setRequests] = useState<LostItemRequest[]>([])
  const [pods, setPods] = useState<PodItem[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modals state
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null)

  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')

  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false)
  const [handoverOtp, setHandoverOtp] = useState('')
  const [otpGeneratedAt, setOtpGeneratedAt] = useState<string | null>(null)

  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LostItemRequest | null>(null)
  const [matchFoundItemIds, setMatchFoundItemIds] = useState<string[]>([])
  const [closeOthers, setCloseOthers] = useState(false)
  const [managerNote, setManagerNote] = useState('')
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)

  const [isActionLoading, setIsActionLoading] = useState(false)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const locationIds = [...new Set(clusters.map(c => c.location_id).filter(Boolean))]
      const [podsRes, warehousesRes] = await Promise.all([
        podApi.getAll(),
        warehouseApi.getAll({ location_ids: locationIds as string[] })
      ])
      setPods(podsRes.data)
      setWarehouses(warehousesRes.data)

      if (activeTab === 'ITEMS') {
        const itemsRes = await lostFoundApi.getAll({
          status: statusFilter === 'all' ? undefined : (statusFilter as LostFoundStatus),
          page,
          limit: 10
        })
        setItems(itemsRes.data)
        if (itemsRes.pagination) setTotalPages(itemsRes.pagination.total_pages)
      } else {
        const requestsRes = await lostFoundApi.getRequests({
          status: statusFilter === 'all' ? undefined : (statusFilter as LostItemRequestStatus),
          page,
          limit: 10
        })
        setRequests(requestsRes.data)
        if (requestsRes.pagination) setTotalPages(requestsRes.pagination.total_pages)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể tải dữ liệu')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab, statusFilter, refreshTrigger, clusters, page])

  useEffect(() => {
    setPage(1)
  }, [activeTab, statusFilter, clusters])

  useEffect(() => {
    const socket = initUserSocket()
    if (!socket) return
    const handleRefresh = () => setRefreshTrigger(prev => prev + 1)
    socket.on('user:notification', handleRefresh)
    socket.on('dashboard:refresh', handleRefresh)
    return () => {
      socket.off('user:notification', handleRefresh)
      socket.off('dashboard:refresh', handleRefresh)
    }
  }, [])


  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return items
    return items.filter(i => 
      i.item_name.toLowerCase().includes(q) || 
      i.serial_number?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    )
  }, [items, search])

  const filteredRequests = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return requests
    return requests.filter(r => 
      r.item_name_reported.toLowerCase().includes(q) || 
      r.description_reported?.toLowerCase().includes(q)
    )
  }, [requests, search])

  // --- Actions ---
  const handleStore = async () => {
    if (!selectedItem || !selectedWarehouseId) return
    try {
      setIsActionLoading(true)
      await lostFoundApi.storeToWarehouse(selectedItem.id, selectedWarehouseId)
      toast.success('Đã cất đồ vào kho thành công')
      setIsStoreModalOpen(false)
      setRefreshTrigger(p => p + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi cất kho')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleGenerateOTP = async () => {
    if (!selectedItem) return
    try {
      setIsActionLoading(true)
      await lostFoundApi.generateHandoverOTP(selectedItem.id)
      toast.success('Đã tạo mã OTP và gửi cho khách hàng')
      setHandoverOtp(res.otp) // Auto-fill OTP
      setOtpGeneratedAt(new Date().toISOString())
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi tạo OTP')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleConfirmHandover = async () => {
    if (!selectedItem || !handoverOtp) return
    try {
      setIsActionLoading(true)
      await lostFoundApi.confirmHandover(selectedItem.id, handoverOtp)
      toast.success('Bàn giao thành công!')
      setIsHandoverModalOpen(false)
      setSelectedItem(null)
      setHandoverOtp('')
      setRefreshTrigger(p => p + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'OTP không hợp lệ hoặc hết hạn')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleMatch = async (isReject = false) => {
    if (!selectedRequest) return
    try {
      setIsActionLoading(true)
      if (isReject) {
        await lostFoundApi.rejectRequest(selectedRequest.id, { manager_note: managerNote })
        toast.success('Đã từ chối yêu cầu')
      } else {
        if (matchFoundItemIds.length === 0) {
          toast.error('Vui lòng chọn ít nhất 1 món đồ nhặt được để khớp')
          return
        }
        await lostFoundApi.matchRequest(selectedRequest.id, { 
          found_item_ids: matchFoundItemIds, 
          manager_note: managerNote,
          close_others: closeOthers
        })
        toast.success(`Đã xác nhận khớp ${matchFoundItemIds.length} món đồ thành công`)
      }
      setIsMatchModalOpen(false)
      setRefreshTrigger(p => p + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Thao tác thất bại')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleOpenHandoverFromRequest = (request: LostItemRequest) => {
    const firstItemId = request.matched_found_item_ids?.[0]
    const item = items.find(i => i.id === firstItemId)
    if (item) {
      setSelectedItem(item)
      setIsHandoverModalOpen(true)
      setHandoverOtp('')
      setOtpGeneratedAt(null)
    } else {
      toast.error('Không tìm thấy thông tin món đồ liên quan. Vui lòng kiểm tra bên tab Kho đồ.')
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Boxes className="text-blue-600 h-8 w-8" />
            Quản lý Lost & Found
          </h1>
          <p className="text-gray-500 mt-1">Theo dõi đồ thất lạc và xử lý yêu cầu từ khách hàng.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setRefreshTrigger(p => p + 1)}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex p-1 bg-gray-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab('ITEMS'); setStatusFilter('all'); }}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ITEMS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Kho đồ nhặt được
          </button>
          <button
            onClick={() => { setActiveTab('REQUESTS'); setStatusFilter('all'); }}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'REQUESTS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Yêu cầu báo mất
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto px-2 relative">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border-none rounded-xl text-sm px-4 py-2 transition-all min-w-[160px] justify-between"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-700">
                  {statusFilter === 'all' 
                    ? 'Tất cả trạng thái' 
                    : activeTab === 'ITEMS' 
                      ? translateStatus(statusFilter as any) 
                      : translateRequestStatus(statusFilter as any)
                  }
                </span>
              </span>
              <ChevronLeft className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-[-90deg]' : 'rotate-[-270deg]'}`} />
            </button>

            {isStatusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsStatusDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-1 mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lọc theo trạng thái</p>
                  </div>
                  <button
                    onClick={() => { setStatusFilter('all'); setIsStatusDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${statusFilter === 'all' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Tất cả trạng thái
                  </button>
                  <div className="h-px bg-gray-50 my-1 mx-2" />
                  {(activeTab === 'ITEMS' ? LOST_FOUND_STATUSES : LOST_ITEM_REQUEST_STATUSES).map(s => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setIsStatusDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${statusFilter === s ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {activeTab === 'ITEMS' ? translateStatus(s as any) : translateRequestStatus(s as any)}
                      {statusFilter === s && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            {activeTab === 'ITEMS' ? (
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Đồ vật</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Vị trí & Kho</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Thời gian</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Khách báo mất</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Mô tả của khách</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Ngày gửi</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400">Đang tải dữ liệu...</td></tr>
            ) : (activeTab === 'ITEMS' ? filteredItems : filteredRequests).length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400">Không tìm thấy bản ghi nào.</td></tr>
            ) : (activeTab === 'ITEMS' ? filteredItems : filteredRequests).map((row: any) => (
              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                {activeTab === 'ITEMS' ? (
                  <>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                          {row.photo_urls?.[0] ? <img src={row.photo_urls[0]} className="h-full w-full object-cover" /> : <Boxes className="text-gray-300" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{row.item_name}</p>
                          <p className="text-xs text-gray-400 font-mono">#{row.serial_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-700">Pod: {row.pod?.name || row.pod_id || 'Không rõ'}</p>
                      <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                        <Store className="h-3 w-3" /> {row.warehouse_id ? `Kho: ${warehouses.find(w => w.id === row.warehouse_id)?.name || row.warehouse_id}` : 'Chưa nhập kho'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass(row.status)}`}>
                        {translateStatus(row.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(row.found_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.status === 'FOUND' && (
                          <button 
                            onClick={() => { setSelectedItem(row); setIsStoreModalOpen(true); }}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Cất vào kho"
                          >
                            <Store className="h-5 w-5" />
                          </button>
                        )}
                        {row.status === 'CLAIM_PENDING' && (
                          <button 
                            onClick={() => { setSelectedItem(row); setIsHandoverModalOpen(true); setHandoverOtp(''); setOtpGeneratedAt(null); }}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="Bàn giao OTP"
                          >
                            <Handshake className="h-5 w-5" />
                          </button>
                        )}
                        <button 
                          onClick={() => { setSelectedItem(row); setIsDetailOpen(true); }}
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all" title="Chi tiết"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{row.user?.name || 'Khách ẩn danh'}</p>
                      <p className="text-xs text-blue-600 font-medium">Đồ báo mất: {row.item_name_reported}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                        <History className="h-3 w-3" /> Booking: {row.booking_id}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 line-clamp-1 max-w-xs">{row.description_reported || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${requestStatusBadgeClass(row.status)}`}>
                        {translateRequestStatus(row.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(row.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      {row.status === 'PENDING' && (
                        <button 
                          onClick={() => { setSelectedRequest(row); setIsMatchModalOpen(true); setMatchFoundItemId(''); setManagerNote(''); }}
                          className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-bold transition-all"
                        >
                          Xử lý Match
                        </button>
                      )}
                      {row.status === 'MATCHED' && (
                        <button 
                          onClick={() => handleOpenHandoverFromRequest(row)}
                          className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl text-sm font-bold transition-all"
                        >
                          Bàn giao ngay
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Hiển thị trang {page} / {totalPages}</p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all text-gray-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => setPage(num)}
                  className={`min-w-[36px] h-9 rounded-lg text-sm font-bold transition-all ${page === num ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                >
                  {num}
                </button>
              ))}

              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all text-gray-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Modal Cất kho */}
      <Modal isOpen={isStoreModalOpen} onClose={() => setIsStoreModalOpen(false)} title="Cất đồ vật vào kho" size="md">
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">Vui lòng chọn kho lưu trữ cho món đồ <span className="font-bold">"{selectedItem?.item_name}"</span>.</p>
          <div className="space-y-4">
            {warehouses.map(w => (
              <label 
                key={w.id} 
                className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedWarehouseId === w.id ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                onClick={() => setSelectedWarehouseId(w.id)}
              >
                <div>
                  <p className="font-bold text-gray-900">{w.name}</p>
                  <p className="text-xs text-gray-500">{w.address}</p>
                </div>
                {selectedWarehouseId === w.id && <CheckCircle className="text-blue-600 h-6 w-6" />}
              </label>
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            <button onClick={() => setIsStoreModalOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all">Hủy</button>
            <button 
              disabled={!selectedWarehouseId || isActionLoading}
              onClick={handleStore}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-200"
            >
              {isActionLoading ? 'Đang xử lý...' : 'Xác nhận Cất kho'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. Modal Bàn giao OTP */}
      <Modal isOpen={isHandoverModalOpen} onClose={() => setIsHandoverModalOpen(false)} title="Bàn giao bằng mã OTP" size="md">
        <div className="p-6 text-center">
          {!otpGeneratedAt ? (
            <div className="py-8">
              <div className="h-20 w-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Handshake className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Bàn giao đồ thất lạc</h3>
              <p className="text-gray-500 mt-2 px-8">Hệ thống sẽ gửi mã OTP đến điện thoại của khách hàng để xác nhận bàn giao.</p>
              <button 
                onClick={handleGenerateOTP}
                disabled={isActionLoading}
                className="mt-8 w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all"
              >
                {isActionLoading ? 'Đang thực hiện...' : 'Gửi mã OTP cho khách'}
              </button>
            </div>
          ) : (
            <div className="py-4">
              <div className="mb-8">
                <p className="text-sm text-gray-500 italic">Mã OTP đã được tự động điền để thuận tiện đối chiếu</p>
                <p className="text-sm font-bold text-purple-600 mt-2">Vui lòng hỏi khách mã OTP họ nhận được:</p>
                <input 
                  type="text" 
                  maxLength={6}
                  value={handoverOtp}
                  readOnly
                  placeholder="------"
                  className="mt-4 w-full text-center text-4xl tracking-[1rem] font-bold border-none bg-gray-50 rounded-2xl py-6 cursor-default focus:ring-0"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setOtpGeneratedAt(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Gửi lại OTP</button>
                <button 
                  disabled={handoverOtp.length < 6 || isActionLoading}
                  onClick={handleConfirmHandover}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                >
                  {isActionLoading ? 'Đang xác minh...' : 'Xác nhận Bàn giao'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 3. SlidePanel Match Split View */}
      <SlidePanel 
        isOpen={isMatchModalOpen} 
        onClose={() => setIsMatchModalOpen(false)} 
        title="Xử lý yêu cầu tìm đồ" 
        width="max-w-4xl"
      >
        <div className="flex flex-col md:flex-row min-h-[500px]">
          {/* Left: Request Detail */}
          <div className="w-full md:w-2/5 p-6 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Thông tin khách báo mất</h3>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div>
                <p className="text-xs text-gray-400">Đồ vật</p>
                <p className="font-bold text-gray-900 text-lg">{selectedRequest?.item_name_reported}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Mô tả chi tiết</p>
                <p className="text-sm text-gray-600 leading-relaxed italic">"{selectedRequest?.description_reported || 'Không có mô tả'}"</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Mã đơn đặt</p>
                <p className="text-sm font-mono text-blue-600">{selectedRequest?.booking_id}</p>
              </div>
            </div>
            
            <div className="mt-8">
              <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Ghi chú xử lý (Tùy chọn)</label>
              <textarea 
                value={managerNote}
                onChange={e => setManagerNote(e.target.value)}
                placeholder="Nhập ghi chú đối chiếu..."
                className="w-full rounded-xl border-gray-200 text-sm focus:ring-blue-500 mb-4"
                rows={3}
              />

              <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                <input 
                  type="checkbox" 
                  id="closeOthers"
                  checked={closeOthers}
                  onChange={e => setCloseOthers(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="closeOthers" className="text-xs text-blue-700 font-medium cursor-pointer">
                  Đóng các yêu cầu khác của khách cho cùng đơn này
                </label>
              </div>
            </div>
          </div>

          {/* Right: Found Items List */}
          <div className="w-full md:w-3/5 p-6 flex flex-col h-[600px]">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Chọn đồ vật khớp từ kho</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {items.filter(i => ['FOUND', 'IN_STORAGE'].includes(i.status)).map(item => {
                const isSelected = matchFoundItemIds.includes(item.id)
                return (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setMatchFoundItemIds(prev => 
                        isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                      )
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-50 hover:border-gray-200 bg-white'}`}
                  >
                    <div className="h-16 w-16 rounded-xl bg-gray-100 shrink-0 overflow-hidden">
                      {item.photo_urls?.[0] ? <img src={item.photo_urls[0]} className="h-full w-full object-cover" /> : <Boxes className="h-full w-full p-4 text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{item.item_name}</p>
                      <p className="text-xs text-gray-400 truncate">Pod: {item.pod?.name || item.pod_id}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">{item.description || 'Không mô tả'}</p>
                    </div>
                    {isSelected && <Check className="text-blue-600 shrink-0" />}
                  </div>
                )
              })}
              {items.filter(i => ['FOUND', 'IN_STORAGE'].includes(i.status)).length === 0 && (
                <div className="text-center py-20 text-gray-400">Kho hiện tại không có đồ vật nào trống để match.</div>
              )}
            </div>
            
            <div className="pt-6 border-t border-gray-100 flex gap-3 mt-4">
              <button 
                onClick={() => handleMatch(true)}
                disabled={isActionLoading}
                className="flex-1 py-3 rounded-xl border border-red-100 text-red-600 font-bold hover:bg-red-50 transition-all"
              >
                Từ chối yêu cầu
              </button>
              <button 
                onClick={() => handleMatch(false)}
                disabled={matchFoundItemIds.length === 0 || isActionLoading}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
              >
                {isActionLoading ? 'Đang khớp...' : matchFoundItemIds.length > 1 ? `Khớp ${matchFoundItemIds.length} món đồ` : 'Xác nhận KHỚP'}
              </button>
            </div>
          </div>
        </div>
      </SlidePanel>

      {/* 4. SlidePanel Chi tiết */}
      <SlidePanel 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)} 
        title={activeTab === 'ITEMS' ? 'Chi tiết đồ vật' : 'Chi tiết yêu cầu'} 
        width="max-w-2xl"
      >
        {selectedItem && (
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3">
                <div className="aspect-square rounded-2xl bg-gray-100 overflow-hidden border border-gray-200">
                  {selectedItem.photo_urls?.[0] ? <img src={selectedItem.photo_urls[0]} className="h-full w-full object-cover" /> : <Boxes className="h-full w-full p-10 text-gray-300" />}
                </div>
              </div>
              <div className="w-full md:w-2/3 space-y-6">
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass(selectedItem.status)}`}>
                    {translateStatus(selectedItem.status)}
                  </span>
                  <h2 className="text-2xl font-extrabold text-gray-900 mt-2">{selectedItem.item_name}</h2>
                  <p className="text-sm font-mono text-gray-400">Serial: {selectedItem.serial_number}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Pod nhặt được</p>
                    <p className="text-sm font-bold text-gray-700">{selectedItem.pod?.name || selectedItem.pod_id}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Thời gian nhặt</p>
                    <p className="text-sm font-bold text-gray-700">{formatDateTime(selectedItem.found_at)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Người báo cáo (Staff)</p>
                    <p className="text-sm font-bold text-gray-700">{selectedItem.found_by_user?.name || selectedItem.found_by_user_id}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Kho lưu trữ</p>
                    <p className="text-sm font-bold text-gray-700">{warehouses.find(w => w.id === selectedItem.warehouse_id)?.name || 'Chưa có'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Mô tả</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl italic">"{selectedItem.description || 'Không có mô tả chi tiết'}"</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  )
}
