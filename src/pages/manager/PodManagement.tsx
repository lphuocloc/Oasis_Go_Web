import { useEffect, useMemo, useState } from 'react'
import { Boxes, RefreshCw, Search, SlidersHorizontal, Check, Clock, Wrench, LayoutTemplate, Wind, Volume2, Zap, Wifi, Timer, History, MapPin, Settings2 } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  POD_STATUSES,
  podApi,
  type PodItem,
  type PodStatus,
  type UpdatePodStatusPayload
} from '../../api/lib/podApi'

import { useManagerScope } from '../../contexts/ManagerScopeContext'
import { initUserSocket } from '../../lib/socket'

const statusBadgeClass = (status: PodStatus) => {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-50 text-emerald-700'
    case 'OCCUPIED':
      return 'bg-blue-50 text-blue-700'
    case 'NEEDS_CLEANING':
      return 'bg-amber-50 text-amber-700'
    case 'CLEANING':
      return 'bg-violet-50 text-violet-700'
    case 'MAINTENANCE':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const podStatusBgColor = (status: PodStatus) => {
  switch (status) {
    case 'AVAILABLE': return 'bg-emerald-500'
    case 'OCCUPIED': return 'bg-blue-500'
    case 'NEEDS_CLEANING': return 'bg-amber-500'
    case 'CLEANING': return 'bg-violet-500'
    case 'MAINTENANCE': return 'bg-rose-500'
    default: return 'bg-gray-500'
  }
}

const getPodStatusBorderColor = (status: PodStatus) => {
  switch (status) {
    case 'AVAILABLE': return 'border-emerald-500 bg-emerald-50 text-emerald-700'
    case 'OCCUPIED': return 'border-blue-500 bg-blue-50 text-blue-700'
    case 'NEEDS_CLEANING': return 'border-amber-500 bg-amber-50 text-amber-700'
    case 'CLEANING': return 'border-violet-500 bg-violet-50 text-violet-700'
    case 'MAINTENANCE': return 'border-rose-500 bg-rose-50 text-rose-700'
    default: return 'border-gray-300 bg-gray-50 text-gray-500'
  }
}

const getLevel = (code: string) => {
  const c = code.toUpperCase()
  if (c.endsWith('U')) return 'U'
  if (c.endsWith('L')) return 'L'
  return '?'
}

export const PodManagement = () => {
  const { clusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()
  const [pods, setPods] = useState<PodItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clusterFilter, setClusterFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<PodStatus[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<{cluster_id: string[], status: PodStatus[]}>({
    cluster_id: [],
    status: []
  })

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailPod, setDetailPod] = useState<PodItem | null>(null)


  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const [statusPod, setStatusPod] = useState<PodItem | null>(null)
  const [nextStatus, setNextStatus] = useState<PodStatus>('AVAILABLE')
  const [maintenanceReason, setMaintenanceReason] = useState('')



  const fetchPods = async () => {
    try {
      setIsLoading(true)
      const response = await podApi.getAll({
        cluster_id: clusterFilter.length > 0 ? clusterFilter.join(',') : undefined,
        status: statusFilter.length > 0 ? (statusFilter.join(',') as PodStatus) : undefined
      })
      setPods(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách Pod')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPods()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterFilter, statusFilter, refreshTrigger])

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

  useEffect(() => {
    if (clusterFilter.length === 0) return
    const validClusterIds = new Set(clusters.map(c => c.id))
    const currentValidFilters = clusterFilter.filter(id => validClusterIds.has(id))
    if (currentValidFilters.length !== clusterFilter.length) {
      setClusterFilter(currentValidFilters)
    }
  }, [clusterFilter, clusters])

  const clusterMap = useMemo(
    () => new Map(clusters.map((cluster) => [cluster.id, cluster])),
    [clusters]
  )

  const isTableLoading = isLoading || isScopeLoading

  const handleRefresh = async () => {
    try {
      await Promise.all([refreshScope(), fetchPods()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể làm mới dữ liệu Pod')
    }
  }

  const filteredPods = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return pods

    return pods.filter((pod) => {
      const clusterName = clusterMap.get(pod.cluster_id)?.name ?? pod.cluster?.name ?? ''
      return [pod.code, pod.name, pod.id, clusterName, pod.status, pod.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [clusterMap, pods, search])

  const podStats = useMemo(
    () => pods.reduce<Record<string, number>>((acc, pod) => {
      acc[pod.status] = (acc[pod.status] ?? 0) + 1
      return acc
    }, {}),
    [pods]
  )

  const closeDetailModal = () => {
    setIsDetailOpen(false)
    setIsDetailLoading(false)
    setDetailPod(null)

  }

  const openDetailModal = async (podId: string) => {
    setIsDetailOpen(true)
    setIsDetailLoading(true)


    try {
      const response = await podApi.getById(podId)
      setDetailPod(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải chi tiết Pod')
      closeDetailModal()
    } finally {
      setIsDetailLoading(false)

    }
  }

  const closeStatusModal = () => {
    if (isStatusSaving) return
    setIsStatusModalOpen(false)
    setStatusPod(null)
    setNextStatus('AVAILABLE')
    setMaintenanceReason('')
  }

  const openStatusModal = (pod: PodItem) => {
    setStatusPod(pod)
    setNextStatus(pod.status)
    setMaintenanceReason(pod.maintenance_status ?? '')
    setIsStatusModalOpen(true)
  }



  const handleUpdateStatus = async () => {
    if (!statusPod) return

    if (nextStatus === 'MAINTENANCE' && !maintenanceReason.trim()) {
      toast.error('Vui lòng nhập lý do bảo trì')
      return
    }

    const payload: UpdatePodStatusPayload = {
      status: nextStatus,
      ...(nextStatus === 'MAINTENANCE' ? { maintenance_status: maintenanceReason.trim() } : {})
    }

    try {
      setIsStatusSaving(true)
      const response = await podApi.updateStatus(statusPod.id, payload)
      toast.success(`Đã cập nhật trạng thái cho ${response.data.code}`)

      if (detailPod?.id === statusPod.id) {
        setDetailPod(response.data)
      }

      closeStatusModal()
      await fetchPods()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái Pod')
    } finally {
      setIsStatusSaving(false)
    }
  }





  const applyFilters = () => {
    setClusterFilter(draftFilters.cluster_id)
    setStatusFilter(draftFilters.status)
    setIsFilterPanelOpen(false)
  }

  const openFilterPanel = () => {
    setDraftFilters({ cluster_id: clusterFilter, status: statusFilter })
    setIsFilterPanelOpen(true)
  }

  const resetDraftFilters = () => {
    setDraftFilters({ cluster_id: [], status: [] })
  }

  const toggleArrayFilter = <T extends string>(current: T[], value: T | 'all', fullLength: number): T[] => {
    if (value === 'all') return []
    if (current.includes(value as T)) return current.filter(v => v !== value)
    const nextArr = [...current, value as T]
    if (nextArr.length === fullLength) return []
    return nextArr
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Quản lý Pod</h1>
          <p className="text-gray-500 mt-1">Xem và quản lý các Pod trong cụm được phân công.</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isTableLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isTableLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-5 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-[220px] pr-4 xl:border-r xl:border-gray-200">
              <p className="text-xs uppercase font-semibold tracking-wide text-gray-500">Tổng số Pod</p>
              <p className="text-[34px] leading-tight font-bold text-gray-900 mt-1">{pods.length}</p>
            </div>

            <div className="min-w-[500px] flex-1 py-1">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{pods.length} pods</p>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-1.5">
                {POD_STATUSES.map((status) => {
                  const count = podStats[status] || 0
                  const percent = pods.length > 0 ? (count / pods.length) * 100 : 0
                  return percent > 0 ? (
                    <div
                      key={status}
                      className={podStatusBgColor(status)}
                      style={{ width: `${percent}%` }}
                    />
                  ) : null
                })}
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {POD_STATUSES.filter(s => podStats[s]).map((status) => (
                  <span key={status} className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <span className={`w-2 h-2 rounded-full ${podStatusBgColor(status)}`} />
                    {status}: {podStats[status]}
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
                placeholder="Tìm kiếm theo mã, tên..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            <button
              type="button"
              onClick={openFilterPanel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {isTableLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-20 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 opacity-20" />
            Đang tải danh sách Pod và cụm...
          </div>
        ) : filteredPods.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-20 text-center text-gray-400">
            <Boxes className="w-12 h-12 mx-auto mb-4 opacity-20" />
            Không tìm thấy Pod nào trong phạm vi quản lý của bạn
          </div>
        ) : (
          (() => {
            // Group by Cluster
            const podsByCluster = filteredPods.reduce<Record<string, PodItem[]>>((acc, pod) => {
              if (!acc[pod.cluster_id]) acc[pod.cluster_id] = []
              acc[pod.cluster_id].push(pod)
              return acc
            }, {})

            return Object.entries(podsByCluster).map(([clusterId, clusterPods]) => {
              const cluster = clusterMap.get(clusterId) ?? clusterPods[0]?.cluster
              // Group by Prefix
              const prefixes = [...new Set(clusterPods.map(p => p.code.charAt(0).toUpperCase()))].sort()

              return (
                <div key={clusterId} className="space-y-6">
                  <div className="flex items-center gap-3 px-1">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                      <LayoutTemplate className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{cluster?.name || clusterId}</h2>
                      <p className="text-xs text-gray-500">Cụm {clusterId.slice(0, 8)} • {clusterPods.length} pods</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    {prefixes.map(prefix => {
                      const prefixPods = clusterPods.filter(p => p.code.startsWith(prefix))
                      const upperRow = prefixPods.filter(p => getLevel(p.code) === 'U').sort((a, b) => a.code.localeCompare(b.code))
                      const lowerRow = prefixPods.filter(p => getLevel(p.code) === 'L').sort((a, b) => a.code.localeCompare(b.code))
                      const otherRow = prefixPods.filter(p => !['U', 'L'].includes(getLevel(p.code))).sort((a, b) => a.code.localeCompare(b.code))

                      return (
                        <div key={prefix} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                          <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Dãy {prefix}</span>
                            <div className="flex gap-2">
                              {upperRow.length > 0 && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">Tầng trên ({upperRow.length})</span>}
                              {lowerRow.length > 0 && <span className="text-[9px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">Tầng dưới ({lowerRow.length})</span>}
                            </div>
                          </div>
                          
                          <div className="p-6 space-y-8">
                            {/* Upper Row */}
                            {upperRow.length > 0 && (
                              <div className="flex flex-wrap gap-3">
                                {upperRow.map(pod => (
                                  <div
                                    key={pod.id}
                                    onClick={() => openDetailModal(pod.id)}
                                    className={`w-24 h-16 rounded-xl border-2 shadow-sm flex flex-col items-center justify-center transition-all hover:scale-105 group relative cursor-pointer ${getPodStatusBorderColor(pod.status)}`}
                                  >
                                    <span className="text-xs font-bold">{pod.code}</span>
                                    <span className="text-[8px] font-bold opacity-60 mt-0.5 truncate px-1 w-full text-center">{pod.status}</span>
                                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                                      <span className="text-[8px] font-bold text-gray-400">U</span>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openStatusModal(pod) }}
                                      title="Cập nhật trạng thái"
                                      className="absolute -bottom-1.5 -left-1.5 w-5 h-5 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hidden group-hover:flex hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                    >
                                      <Settings2 className="w-2.5 h-2.5 text-gray-500" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Lower Row */}
                            {lowerRow.length > 0 && (
                              <div className="flex flex-wrap gap-3">
                                {lowerRow.map(pod => (
                                  <div
                                    key={pod.id}
                                    onClick={() => openDetailModal(pod.id)}
                                    className={`w-24 h-16 rounded-xl border-2 shadow-sm flex flex-col items-center justify-center transition-all hover:scale-105 group relative cursor-pointer ${getPodStatusBorderColor(pod.status)}`}
                                  >
                                    <span className="text-xs font-bold">{pod.code}</span>
                                    <span className="text-[8px] font-bold opacity-60 mt-0.5 truncate px-1 w-full text-center">{pod.status}</span>
                                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                                      <span className="text-[8px] font-bold text-gray-400">L</span>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openStatusModal(pod) }}
                                      title="Cập nhật trạng thái"
                                      className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hidden group-hover:flex hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                    >
                                      <Settings2 className="w-2.5 h-2.5 text-gray-500" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Others */}
                            {otherRow.length > 0 && (
                              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                                {otherRow.map(pod => (
                                  <div
                                    key={pod.id}
                                    onClick={() => openDetailModal(pod.id)}
                                    className={`w-24 h-16 rounded-xl border-2 shadow-sm flex flex-col items-center justify-center transition-all hover:scale-105 group relative cursor-pointer ${getPodStatusBorderColor(pod.status)}`}
                                  >
                                    <span className="text-xs font-bold">{pod.code}</span>
                                    <span className="text-[8px] font-bold opacity-60 mt-0.5 truncate px-1 w-full text-center">{pod.status}</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openStatusModal(pod) }}
                                      title="Cập nhật trạng thái"
                                      className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hidden group-hover:flex hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                    >
                                      <Settings2 className="w-2.5 h-2.5 text-gray-500" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          })()
        )}
      </div>

      <Modal
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        title="Bộ lọc Pod"
        size="xl"
      >
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-900">Trạng thái</label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraftFilters(prev => ({ ...prev, status: toggleArrayFilter(prev.status, 'all', POD_STATUSES.length) }))}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.status.length === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {draftFilters.status.length === 0 && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                Tất cả
              </button>
              {POD_STATUSES.map(status => {
                const isSelected = draftFilters.status.includes(status)
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setDraftFilters(prev => ({ ...prev, status: toggleArrayFilter(prev.status, status, POD_STATUSES.length) }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {isSelected && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                    {status}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-900">Cụm (Cluster)</label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraftFilters(prev => ({ ...prev, cluster_id: toggleArrayFilter(prev.cluster_id, 'all', clusters.length) }))}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.cluster_id.length === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {draftFilters.cluster_id.length === 0 && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                Tất cả cụm
              </button>
              {clusters.map(cluster => {
                const isSelected = draftFilters.cluster_id.includes(cluster.id)
                return (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => setDraftFilters(prev => ({ ...prev, cluster_id: toggleArrayFilter(prev.cluster_id, cluster.id, clusters.length) }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {isSelected && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                    {cluster.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={resetDraftFilters}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Thiết lập lại
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDetailOpen}
        onClose={closeDetailModal}
        title="Chi tiết Pod"
        size="5xl"
      >
        {isDetailLoading ? (
          <div className="py-20 text-center text-gray-500">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4 text-indigo-500" />
            <p className="font-medium animate-pulse">Đang tải chi tiết Pod...</p>
          </div>
        ) : !detailPod ? (
          <div className="py-20 text-center text-gray-400">Không tìm thấy chi tiết cho Pod này.</div>
        ) : (
          <div className="space-y-8">
            {/* Header Status Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-gray-50/80 p-6 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border-2 bg-white ${getPodStatusBorderColor(detailPod.status)}`}>
                  <LayoutTemplate className="w-8 h-8 text-gray-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900">{detailPod.code}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(detailPod.status)}`}>
                      {detailPod.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mt-0.5">{detailPod.name}</p>
                </div>
              </div>

              {detailPod.status === 'MAINTENANCE' && detailPod.maintenance_status && (
                <div className="bg-rose-50 text-rose-700 px-4 py-2 rounded-xl border border-rose-100 text-xs font-medium max-w-xs shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wrench className="w-3.5 h-3.5" />
                    <span className="font-bold uppercase tracking-wide">Ghi chú bảo trì</span>
                  </div>
                  {detailPod.maintenance_status}
                </div>
              )}
            </div>

            {/* Primary Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">Vị trí & Cụm</h4>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-gray-500">
                      <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                        <Boxes className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-tight">Cụm</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 truncate max-w-[180px]">
                      {detailPod.cluster?.name ?? clusterMap.get(detailPod.cluster_id)?.name ?? detailPod.cluster_id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-gray-500">
                      <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-tight">Vị trí tầng</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {getLevel(detailPod.code) === 'U' ? 'Tầng trên (Upper)' : 'Tầng dưới (Lower)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">Thời gian vận hành</h4>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-gray-500">
                      <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                        <History className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-tight">Dọn dẹp cuối</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {detailPod.last_cleaned_at ? new Date(detailPod.last_cleaned_at).toLocaleString('vi-VN') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-gray-500">
                      <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-tight">Ngày ra mắt</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {detailPod.createdAt ? new Date(detailPod.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Specs Grid */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">Cấu hình kỹ thuật</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-indigo-200 transition-all shadow-sm">
                  <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Cách âm</span>
                  <span className="text-sm font-bold text-gray-900 mt-1">{detailPod.soundproof_level}/5</span>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-cyan-200 transition-all shadow-sm">
                  <div className="p-3 bg-cyan-50 text-cyan-500 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                    <Wind className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Thông gió</span>
                  <span className="text-sm font-bold text-gray-900 mt-1">{detailPod.ventilation_level}/5</span>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-amber-200 transition-all shadow-sm">
                  <div className="p-3 bg-amber-50 text-amber-500 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Ổ cắm điện</span>
                  <span className="text-sm font-bold text-gray-900 mt-1">{detailPod.power_outlets} cổng</span>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-emerald-200 transition-all shadow-sm">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Wi-Fi</span>
                  <span className="text-sm font-bold text-gray-900 mt-1">{detailPod.wifi_available ? 'Sẵn sàng' : 'Không có'}</span>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-violet-200 transition-all shadow-sm">
                  <div className="p-3 bg-violet-50 text-violet-500 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                    <Timer className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Phiên tối đa</span>
                  <span className="text-sm font-bold text-gray-900 mt-1">{detailPod.max_session_duration}ph</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {detailPod.description && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">Ghi chú & Mô tả</h4>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-inner">
                  <p className="text-sm text-gray-600 leading-relaxed italic">
                    "{detailPod.description}"
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={() => { closeDetailModal(); openStatusModal(detailPod) }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <Settings2 className="w-4 h-4" />
                Cập nhật trạng thái
              </button>
              <button
                onClick={closeDetailModal}
                className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isStatusModalOpen}
        onClose={closeStatusModal}
        title={statusPod ? `Cập nhật trạng thái - ${statusPod.code}` : 'Cập nhật trạng thái Pod'}
        size="md"
        footer={(
          <>
            <button
              onClick={closeStatusModal}
              disabled={isStatusSaving}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              onClick={handleUpdateStatus}
              disabled={isStatusSaving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isStatusSaving ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as PodStatus)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {POD_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {nextStatus === 'MAINTENANCE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lý do bảo trì</label>
              <textarea
                rows={3}
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                placeholder="Mô tả sự cố cần bảo trì"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          )}
        </div>
      </Modal>


    </div>
  )
}
