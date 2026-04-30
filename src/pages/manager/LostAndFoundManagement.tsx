import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Boxes,
  CheckCircle,
  Eye,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserCheck,
  X
} from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  LOST_FOUND_STATUSES,
  lostFoundApi,
  type LostFoundItem,
  type LostFoundStatus
} from '../../api/lib/lostFoundApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { initUserSocket } from '../../lib/socket'

const statusBadgeClass = (status: LostFoundStatus) => {
  switch (status) {
    case 'FOUND':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'CLAIMED':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'RETURNED_TO_USER':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'DISPOSED':
      return 'bg-gray-100 text-gray-700 border border-gray-300'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

const statusDotClass = (status: LostFoundStatus) => {
  switch (status) {
    case 'FOUND': return 'bg-blue-500'
    case 'CLAIMED': return 'bg-amber-500'
    case 'RETURNED_TO_USER': return 'bg-emerald-500'
    case 'DISPOSED': return 'bg-gray-400'
    default: return 'bg-slate-400'
  }
}

const translateStatus = (status: LostFoundStatus) => {
  switch (status) {
    case 'FOUND': return 'Đã nhặt được'
    case 'CLAIMED': return 'Có người nhận'
    case 'RETURNED_TO_USER': return 'Đã trả lại'
    case 'DISPOSED': return 'Đã thanh lý'
    default: return status
  }
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('vi-VN')
}

export const LostAndFoundManagement = () => {
  const { clusters, refreshScope } = useManagerScope()

  const [items, setItems] = useState<LostFoundItem[]>([])
  const [pods, setPods] = useState<PodItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [clusterFilter, setClusterFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | LostFoundStatus>('all')
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    item_name: '',
    description: '',
    pod_id: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isStatusUpdateSaving, setIsStatusUpdateSaving] = useState(false)

  const fetchPrimaryData = async () => {
    try {
      setIsLoading(true)

      const podsResponse = await podApi.getAll({
        cluster_id: clusterFilter === 'all' ? undefined : clusterFilter,
      })

      const podIdsParam = podsResponse.data.map((pod) => pod.id).join(',')
      const listFilters = {
        pod_id: podIdsParam || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }

      const itemsResponse = await lostFoundApi.getAll(listFilters)

      setPods(podsResponse.data)
      setItems(itemsResponse.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to load lost and found items')
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrimaryData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterFilter, statusFilter, clusters, refreshTrigger])

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

  const podMap = useMemo(() => new Map(pods.map((pod) => [pod.id, pod])), [pods])
  const clusterMap = useMemo(() => new Map(clusters.map((cluster) => [cluster.id, cluster])), [clusters])

  const itemStats = useMemo(() => {
    return items.reduce<Record<LostFoundStatus, number>>(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1
        return acc
      },
      {
        FOUND: 0,
        CLAIMED: 0,
        RETURNED_TO_USER: 0,
        DISPOSED: 0,
      }
    )
  }, [items])

  const statusSummary = useMemo(() => {
    return LOST_FOUND_STATUSES.map((status) => {
      const count = itemStats[status] || 0
      const percent = items.length > 0 ? (count / items.length) * 100 : 0
      return { status, count, percent }
    })
  }, [itemStats, items.length])

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return items

    return items.filter((item) => {
      const pod = item.pod_id ? podMap.get(item.pod_id) : null
      const clusterName = pod ? clusterMap.get(pod.cluster_id)?.name : ''
      return [
        item.id,
        item.item_name,
        item.description,
        item.pod?.name,
        item.pod?.code,
        pod?.code,
        pod?.name,
        clusterName,
        item.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [items, search, podMap, clusterMap])

  const openDetailModal = async (item: LostFoundItem) => {
    setSelectedItem(item)
    setIsDetailOpen(true)
  }

  const closeDetailModal = () => {
    setIsDetailOpen(false)
    setSelectedItem(null)
  }

  const openCreateModal = () => {
    setCreateForm({
      item_name: '',
      description: '',
      pod_id: ''
    })
    setSelectedFile(null)
    setIsCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.item_name) {
      toast.error('Item name is required')
      return
    }

    try {
      setIsCreating(true)
      await lostFoundApi.create({
        ...createForm,
        photo: selectedFile || undefined
      })
      toast.success('Lost & Found item reported successfully')
      setIsCreateModalOpen(false)
      await fetchPrimaryData()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to report item')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateStatus = async (status: LostFoundStatus) => {
    if (!selectedItem) return

    try {
      setIsStatusUpdateSaving(true)
      await lostFoundApi.updateStatus(selectedItem.id, { status })
      toast.success(`Item status updated to ${status}`)

      // Update local state
      const updatedItem = { ...selectedItem, status }
      setItems(prev => prev.map(item => item.id === selectedItem.id ? updatedItem : item))
      setSelectedItem(updatedItem)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to update status')
    } finally {
      setIsStatusUpdateSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Quản lý Đồ thất lạc</h1>
          <p className="text-gray-500 mt-1">Quản lý các tài sản khách hàng bỏ quên tại cụm phòng bạn phụ trách.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Báo cáo đồ nhặt được
          </button>
          <button
            onClick={async () => {
              await refreshScope()
              await fetchPrimaryData()
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-5 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-[220px] pr-4 xl:border-r xl:border-gray-200">
              <p className="text-xs uppercase font-semibold tracking-wide text-gray-500">Tổng số vật phẩm</p>
              <p className="text-[34px] leading-tight font-bold text-gray-900 mt-1">{items.length}</p>
            </div>

            <div className="min-w-[500px] flex-1 py-1">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{items.length} vật phẩm</p>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-1.5">
                {statusSummary.map((item) => (
                  <div
                    key={item.status}
                    className={statusDotClass(item.status)}
                    style={{ width: `${item.percent}%` }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {statusSummary.filter((item) => item.count > 0).map((item) => (
                  <span key={item.status} className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <span className={`w-2 h-2 rounded-full ${statusDotClass(item.status)}`} />
                    {translateStatus(item.status)}: {item.count}
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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm kiếm vật phẩm, mô tả, phòng..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Món đồ</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Vị trí (Phòng)</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Trạng thái</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Ngày nhặt được</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Đang tải danh sách đồ thất lạc...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Không tìm thấy đồ thất lạc nào.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const pod = item.pod_id ? podMap.get(item.pod_id) : null
                  const cluster = pod ? clusterMap.get(pod.cluster_id) : null

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-gray-50/70">
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          {item.photo_url ? (
                            <img src={item.photo_url} alt={item.item_name} className="h-10 w-10 rounded-md object-cover border border-gray-200" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50">
                              <Boxes className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{item.item_name}</p>
                            <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px]" title={item.description || ''}>{item.description || 'Không có mô tả'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-gray-900">{item.pod?.name || item.pod?.code || pod?.code || 'Không rõ'}</p>
                        <p className="text-xs text-gray-500">{cluster?.name || '-'}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                          {translateStatus(item.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-gray-500">{formatDateTime(item.found_at)}</td>
                      <td className="px-6 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailModal(item)}
                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-5 w-5" />
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
      </div>

      <Modal isOpen={isDetailOpen} onClose={closeDetailModal} title="Chi tiết Đồ thất lạc" size="lg">
        {selectedItem && (
          <div className="flex flex-col h-auto max-h-[80vh]">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-start gap-4">
                {selectedItem.photo_url ? (
                  <a href={selectedItem.photo_url} target="_blank" rel="noreferrer" className="shrink-0 h-24 w-24 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity">
                    <img src={selectedItem.photo_url} alt={selectedItem.item_name} className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <div className="shrink-0 flex h-24 w-24 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedItem.item_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Mã: {selectedItem.id}</p>
                  <div className="mt-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(selectedItem.status)}`}>
                      {translateStatus(selectedItem.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Phòng (Pod)</p>
                  <p className="text-sm font-medium text-gray-900">{selectedItem.pod?.name || selectedItem.pod?.code || podMap.get(selectedItem.pod_id || '')?.code || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ngày nhặt được</p>
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedItem.found_at)}</p>
                </div>
                {selectedItem.booking_id && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Mã Đơn đặt (Booking)</p>
                    <p className="font-mono text-xs text-gray-800">{selectedItem.booking_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nhặt bởi (User ID)</p>
                  <p className="font-mono text-xs text-gray-800">{selectedItem.found_by_user_id}</p>
                </div>
              </div>

              {selectedItem.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Mô tả</h4>
                  <div className="p-4 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm whitespace-pre-wrap">
                    {selectedItem.description}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Cập nhật trạng thái</h4>
              <div className="flex flex-wrap gap-2">
                {selectedItem.status !== 'FOUND' && (
                  <button
                    disabled={isStatusUpdateSaving}
                    onClick={() => handleUpdateStatus('FOUND')}
                    className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Trở về ĐÃ NHẶT ĐƯỢC
                  </button>
                )}
                {selectedItem.status !== 'CLAIMED' && (
                  <button
                    disabled={isStatusUpdateSaving}
                    onClick={() => handleUpdateStatus('CLAIMED')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    <UserCheck className="w-4 h-4" /> Đánh dấu CÓ NGƯỜI NHẬN
                  </button>
                )}
                {selectedItem.status !== 'RETURNED_TO_USER' && (
                  <button
                    disabled={isStatusUpdateSaving}
                    onClick={() => handleUpdateStatus('RETURNED_TO_USER')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> Đánh dấu ĐÃ TRẢ LẠI
                  </button>
                )}
                {selectedItem.status !== 'DISPOSED' && (
                  <button
                    disabled={isStatusUpdateSaving}
                    onClick={() => handleUpdateStatus('DISPOSED')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-50 ml-auto"
                  >
                    <Trash2 className="w-4 h-4" /> Đánh dấu ĐÃ THANH LÝ
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isCreateModalOpen} onClose={() => { if (!isCreating) setIsCreateModalOpen(false) }} title="Báo cáo Đồ thất lạc" size="md">
        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên vật phẩm <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={createForm.item_name}
              onChange={e => setCreateForm(prev => ({ ...prev, item_name: e.target.value }))}
              placeholder="VD: iPhone 13 Pro, Ví đen"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí (Phòng)</label>
            <select
              value={createForm.pod_id}
              onChange={e => setCreateForm(prev => ({ ...prev, pod_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Chọn một Phòng...</option>
              {pods.map(pod => (
                <option key={pod.id} value={pod.id}>{pod.code} - {clusterMap.get(pod.cluster_id)?.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Nếu vật phẩm được tìm thấy bên trong một phòng cụ thể.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              rows={3}
              value={createForm.description}
              onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Đặc điểm nhận dạng, màu sắc..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <Upload className="h-4 w-4" />
                {selectedFile ? 'Đổi ảnh' : 'Tải ảnh lên'}
              </button>
              {selectedFile && <span className="text-sm text-gray-600 truncate flex-1">{selectedFile.name}</span>}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  setSelectedFile(e.target.files[0])
                }
              }}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isCreating || !createForm.item_name}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? 'Đang báo cáo...' : 'Xác nhận Báo cáo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* FILTER PANEL */}
      <div className={`fixed inset-0 z-50 ${isFilterPanelOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isFilterPanelOpen}>
        <div 
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isFilterPanelOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsFilterPanelOpen(false)}
        />
        <div 
          className={`absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 ${isFilterPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Bộ lọc đồ thất lạc</h2>
              <button 
                onClick={() => setIsFilterPanelOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái xử lý</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="status"
                      checked={statusFilter === 'all'} 
                      onChange={() => setStatusFilter('all')}
                      className="text-blue-600 focus:ring-blue-500" 
                    />
                    <span className="text-sm text-gray-700">Tất cả (Không lọc)</span>
                  </label>
                  {LOST_FOUND_STATUSES.map(status => (
                    <label key={status} className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="status"
                        checked={statusFilter === status} 
                        onChange={() => setStatusFilter(status)}
                        className="text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="text-sm text-gray-700">{translateStatus(status)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Khu vực (Cụm phòng)</label>
                <select
                  value={clusterFilter}
                  onChange={(e) => setClusterFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">Tất cả cụm phòng</option>
                  {clusters.map(cluster => (
                    <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 bg-gray-50">
              <button 
                onClick={() => setIsFilterPanelOpen(false)}
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
