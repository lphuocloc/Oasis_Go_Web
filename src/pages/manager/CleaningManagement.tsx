import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Eye, Wrench, X, SlidersHorizontal } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  MAINTENANCE_TASK_STATUSES,
  maintenanceTaskApi,
  type MaintenanceTaskItem,
  type MaintenanceTaskStatus
} from '../../api/lib/maintenanceTaskApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { initUserSocket } from '../../lib/socket'

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'IN_PROGRESS':
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'CLOSED':
      return 'bg-gray-100 text-gray-700 border border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const statusDotClass = (status: string) => {
  switch (status) {
    case 'PENDING': return 'bg-amber-500'
    case 'IN_PROGRESS': return 'bg-blue-500'
    case 'RESOLVED': return 'bg-emerald-500'
    case 'CLOSED': return 'bg-gray-400'
    default: return 'bg-slate-400'
  }
}

const translateStatus = (status: string) => {
  switch (status) {
    case 'PENDING': return 'Chờ xử lý'
    case 'IN_PROGRESS': return 'Đang xử lý'
    case 'RESOLVED': return 'Đã giải quyết'
    case 'CLOSED': return 'Đã đóng'
    default: return status
  }
}

export const CleaningManagement = () => {
  const { clusters, refreshScope } = useManagerScope()
  const [tasks, setTasks] = useState<MaintenanceTaskItem[]>([])
  const [pods, setPods] = useState<PodItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clusterFilter, setClusterFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<MaintenanceTaskStatus[]>([])
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const toggleArrayFilter = <T extends string>(current: T[], value: T | 'all', fullLength: number): T[] => {
    if (value === 'all') return []
    if (current.includes(value as T)) return current.filter(v => v !== value)
    const nextArr = [...current, value as T]
    if (nextArr.length === fullLength) return []
    return nextArr
  }

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailTask, setDetailTask] = useState<MaintenanceTaskItem | null>(null)

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const [statusTask, setStatusTask] = useState<MaintenanceTaskItem | null>(null)
  const [nextStatus, setNextStatus] = useState<MaintenanceTaskStatus>('PENDING')

  const fetchPrimaryData = async () => {
    try {
      setIsLoading(true)

      const podsRes = await podApi.getAll({ cluster_id: clusterFilter.length > 0 ? clusterFilter.join(',') : undefined })
      const podIdsParam = clusterFilter.length > 0 ? podsRes.data.map(p => p.id).join(',') : undefined

      const tasksRes = await maintenanceTaskApi.getAll({
        pod_ids: podIdsParam,
        status: statusFilter.length > 0 ? (statusFilter.join(',') as MaintenanceTaskStatus) : undefined
      })
      setPods(podsRes.data)
      setTasks(tasksRes.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to load maintenance tasks')
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

  const podMap = useMemo(() => new Map(pods.map(p => [p.id, p])), [pods])
  const clusterMap = useMemo(() => new Map(clusters.map(c => [c.id, c])), [clusters])

  const filteredTasks = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return tasks

    return tasks.filter((task) => {
      const pod = podMap.get(task.pod_id)
      const clusterName = pod ? clusterMap.get(pod.cluster_id)?.name : ''
      return [task.id, task.description, pod?.code, pod?.name, clusterName, task.status]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [tasks, search, podMap, clusterMap])

  const taskStats = useMemo(
    () => tasks.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1
      return acc
    }, {}),
    [tasks]
  )

  const statusSummary = useMemo(() => {
    return MAINTENANCE_TASK_STATUSES.map((status) => {
      const count = taskStats[status] || 0
      const percent = tasks.length > 0 ? (count / tasks.length) * 100 : 0
      return { status, count, percent }
    })
  }, [taskStats, tasks.length])

  const handleRefresh = async () => {
    await refreshScope()
    fetchPrimaryData()
  }

  const openDetailModal = async (task: MaintenanceTaskItem) => {
    setIsDetailOpen(true)
    setIsDetailLoading(true)
    setDetailTask(task)
    try {
      const taskRes = await maintenanceTaskApi.getById(task.id)
      setDetailTask(taskRes.data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to load task details')
    } finally {
      setIsDetailLoading(false)
    }
  }

  const closeDetailModal = () => {
    setIsDetailOpen(false)
    setDetailTask(null)
  }

  const openStatusModal = (task: MaintenanceTaskItem) => {
    setStatusTask(task)
    setNextStatus(task.status)
    setIsStatusModalOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!statusTask) return
    try {
      setIsStatusSaving(true)
      await maintenanceTaskApi.update(statusTask.id, { status: nextStatus })
      toast.success('Maintenance task status updated')
      setIsStatusModalOpen(false)
      fetchPrimaryData()
      if (detailTask?.id === statusTask.id) {
        const taskRes = await maintenanceTaskApi.getById(statusTask.id)
        setDetailTask(taskRes.data)
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Failed to update status')
    } finally {
      setIsStatusSaving(false)
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Quản lý Nhiệm vụ Dọn dẹp & Bảo trì</h1>
          <p className="text-gray-500 mt-1">Theo dõi và cập nhật trạng thái các yêu cầu bảo trì, dọn dẹp tại cụm phòng.</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-5 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-[220px] pr-4 xl:border-r xl:border-gray-200">
              <p className="text-xs uppercase font-semibold tracking-wide text-gray-500">Tổng số nhiệm vụ</p>
              <div className="flex items-center gap-2 mt-1">
                <Wrench className="w-5 h-5 text-purple-500" />
                <p className="text-[34px] leading-tight font-bold text-gray-900">{tasks.length}</p>
              </div>
            </div>

            <div className="min-w-[500px] flex-1 py-1">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{tasks.length} nhiệm vụ</p>
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm nhiệm vụ, phòng..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Thông tin Nhiệm vụ</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Thông tin Phòng</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Trạng thái</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Ngày tạo</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Đang tải nhiệm vụ bảo trì...</td></tr>
              ) : filteredTasks.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Không tìm thấy nhiệm vụ nào</td></tr>
              ) : (
                filteredTasks.map((task) => {
                  const pod = podMap.get(task.pod_id)
                  const cluster = pod ? clusterMap.get(pod.cluster_id) : null
                  return (
                    <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-gray-900 line-clamp-2 max-w-xs">{task.description || 'Không có mô tả'}</p>
                        <p className="text-xs text-gray-400 mt-1 font-mono">Mã: {task.id.split('-')[0]}...</p>
                        {task.incident_id && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-bold uppercase rounded-full border border-orange-200">Từ Báo cáo sự cố</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-gray-900">{pod?.name || 'Không rõ'}</p>
                        <p className="text-xs text-gray-500">{cluster?.name || '-'}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(task.status)}`}>
                          {translateStatus(task.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-gray-500">
                        {new Date(task.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailModal(task)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors tooltip-trigger"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-5 h-5" />
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

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={closeDetailModal} title="Chi tiết Nhiệm vụ" size="lg">
        {isDetailLoading || !detailTask ? (
          <div className="py-12 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Trạng thái</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClass(detailTask.status)}`}>
                    {translateStatus(detailTask.status)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { closeDetailModal(); openStatusModal(detailTask); }}
                  className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Cập nhật Trạng thái
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Thông tin Phòng</p>
                <p className="text-sm font-medium text-gray-900">{podMap.get(detailTask.pod_id)?.name || detailTask.pod_id}</p>
                <p className="text-xs text-gray-500">{clusterMap.get(podMap.get(detailTask.pod_id)?.cluster_id || '')?.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tạo bởi</p>
                <p className="text-sm font-medium text-gray-900 font-mono break-all">{detailTask.reported_by}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ngày tạo</p>
                <p className="text-sm text-gray-900">{new Date(detailTask.created_at).toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nguồn tạo</p>
                {detailTask.incident_id && <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">Từ Sự cố: {detailTask.incident_id.split('-')[0]}</p>}
                {!detailTask.incident_id && <p className="text-xs text-gray-500">Phân công trực tiếp</p>}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mô tả vấn đề</p>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-800 text-sm whitespace-pre-wrap">
                {detailTask.description || 'Không có mô tả chi tiết.'}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isStatusSaving && setIsStatusModalOpen(false)} title="Cập nhật Trạng thái Nhiệm vụ" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái mới</label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as MaintenanceTaskStatus)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            >
              {MAINTENANCE_TASK_STATUSES.map(s => <option key={s} value={s}>{translateStatus(s)}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button disabled={isStatusSaving} onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Hủy</button>
            <button disabled={isStatusSaving} onClick={handleUpdateStatus} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium">
              {isStatusSaving ? 'Đang lưu...' : 'Lưu trạng thái'}
            </button>
          </div>
        </div>
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
              <h2 className="text-lg font-bold text-gray-900">Bộ lọc nhiệm vụ</h2>
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
                      type="checkbox"
                      checked={statusFilter.length === 0}
                      onChange={() => setStatusFilter([])}
                      className="rounded text-purple-600 focus:ring-purple-500" 
                    />
                    <span className="text-sm text-gray-700">Tất cả (Không lọc)</span>
                  </label>
                  {MAINTENANCE_TASK_STATUSES.map(status => (
                    <label key={status} className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={statusFilter.includes(status)}
                        onChange={() => setStatusFilter(toggleArrayFilter(statusFilter, status, MAINTENANCE_TASK_STATUSES.length))}
                        className="rounded text-purple-600 focus:ring-purple-500" 
                      />
                      <span className="text-sm text-gray-700">{translateStatus(status)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Khu vực (Cụm phòng)</label>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={clusterFilter.length === 0}
                      onChange={() => setClusterFilter([])}
                      className="rounded text-purple-600 focus:ring-purple-500" 
                    />
                    <span className="text-sm text-gray-700">Tất cả cụm phòng</span>
                  </label>
                  {clusters.map(cluster => (
                    <label key={cluster.id} className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={clusterFilter.includes(cluster.id)}
                        onChange={() => setClusterFilter(toggleArrayFilter(clusterFilter, cluster.id, clusters.length))}
                        className="rounded text-purple-600 focus:ring-purple-500" 
                      />
                      <span className="text-sm text-gray-700">{cluster.name}</span>
                    </label>
                  ))}
                </div>
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
