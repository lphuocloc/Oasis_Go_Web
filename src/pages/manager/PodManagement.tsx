import { useEffect, useMemo, useState } from 'react'
import { Boxes, Edit2, Eye, RefreshCw, Search, SlidersHorizontal, Check, CheckCircle, Clock, AlertCircle, X, Wrench, LayoutTemplate, Wind, Volume2, Zap, Wifi, Timer, History, MapPin } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  POD_STATUSES,
  podApi,
  type PodItem,
  type PodStatus,
  type UpdatePodStatusPayload
} from '../../api/lib/podApi'
import { userApi, type UserListItem } from '../../api/lib/userApi'
import { cleaningTaskApi } from '../../api/lib/cleaningTaskApi'
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
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const [statusPod, setStatusPod] = useState<PodItem | null>(null)
  const [nextStatus, setNextStatus] = useState<PodStatus>('AVAILABLE')
  const [maintenanceReason, setMaintenanceReason] = useState('')

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignPod, setAssignPod] = useState<PodItem | null>(null)
  const [cleaners, setCleaners] = useState<UserListItem[]>([])
  const [selectedCleaner, setSelectedCleaner] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  const fetchPods = async () => {
    try {
      setIsLoading(true)
      const response = await podApi.getAll({
        cluster_id: clusterFilter.length > 0 ? clusterFilter.join(',') : undefined,
        status: statusFilter.length > 0 ? (statusFilter.join(',') as PodStatus) : undefined
      })
      setPods(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load pods')
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
      toast.error(error?.response?.data?.message || 'Failed to refresh pod data')
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
    setDetailLoadingId(null)
  }

  const openDetailModal = async (podId: string) => {
    setIsDetailOpen(true)
    setIsDetailLoading(true)
    setDetailLoadingId(podId)

    try {
      const response = await podApi.getById(podId)
      setDetailPod(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load pod detail')
      closeDetailModal()
    } finally {
      setIsDetailLoading(false)
      setDetailLoadingId(null)
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
      toast.error('Maintenance reason is required')
      return
    }

    const payload: UpdatePodStatusPayload = {
      status: nextStatus,
      ...(nextStatus === 'MAINTENANCE' ? { maintenance_status: maintenanceReason.trim() } : {})
    }

    try {
      setIsStatusSaving(true)
      const response = await podApi.updateStatus(statusPod.id, payload)
      toast.success(`Updated status of ${response.data.code}`)

      if (detailPod?.id === statusPod.id) {
        setDetailPod(response.data)
      }

      closeStatusModal()
      await fetchPods()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update pod status')
    } finally {
      setIsStatusSaving(false)
    }
  }

  const openAssignModal = async (pod: PodItem) => {
    setAssignPod(pod)
    setIsAssignModalOpen(true)
    if (cleaners.length === 0) {
      try {
        const res = await userApi.getActiveUsers('cleaner')
        setCleaners(res.data)
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load cleaners')
      }
    }
  }

  const closeAssignModal = () => {
    if (isAssigning) return
    setIsAssignModalOpen(false)
    setAssignPod(null)
    setSelectedCleaner('')
  }

  const handleAssignCleaner = async () => {
    if (!assignPod || !selectedCleaner) {
      toast.error('Please select a cleaner')
      return
    }
    try {
      setIsAssigning(true)
      await cleaningTaskApi.create({
        pod_id: assignPod.id,
        cleaner_id: selectedCleaner,
        request_source: 'USER_REQUEST'
      })
      toast.success('Cleaner assigned successfully')
      closeAssignModal()
      fetchPods()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to assign cleaner')
    } finally {
      setIsAssigning(false)
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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Pod Management</h1>
          <p className="text-gray-500 mt-1">View and manage pods in your assigned clusters.</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isTableLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isTableLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-5 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-[220px] pr-4 xl:border-r xl:border-gray-200">
              <p className="text-xs uppercase font-semibold tracking-wide text-gray-500">Total Pods</p>
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
                placeholder="Search by code, string..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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

      <div className="space-y-12">
        {isTableLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-20 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 opacity-20" />
            Loading pods and clusters...
          </div>
        ) : filteredPods.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-20 text-center text-gray-400">
            <Boxes className="w-12 h-12 mx-auto mb-4 opacity-20" />
            No pods found in your scope
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
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Dãy {prefix}</span>
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
                                    <span className="text-xs font-black">{pod.code}</span>
                                    <span className="text-[8px] font-bold opacity-60 mt-0.5 truncate px-1 w-full text-center">{pod.status}</span>
                                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                                      <span className="text-[8px] font-black text-gray-400">U</span>
                                    </div>
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
                                    <span className="text-xs font-black">{pod.code}</span>
                                    <span className="text-[8px] font-bold opacity-60 mt-0.5 truncate px-1 w-full text-center">{pod.status}</span>
                                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                                      <span className="text-[8px] font-black text-gray-400">L</span>
                                    </div>
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
                                    className={`w-24 h-16 rounded-xl border-2 shadow-sm flex flex-col items-center justify-center transition-all hover:scale-105 cursor-pointer ${getPodStatusBorderColor(pod.status)}`}
                                  >
                                    <span className="text-xs font-black">{pod.code}</span>
                                    <span className="text-[8px] font-bold opacity-60 mt-0.5 truncate px-1 w-full text-center">{pod.status}</span>
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

      {/* Filter panel */}
      <div className={`fixed inset-0 z-50 ${isFilterPanelOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isFilterPanelOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isFilterPanelOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsFilterPanelOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-hidden bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl flex flex-col ${isFilterPanelOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <p className="text-xs text-gray-500 mt-1">Filter pods by status and cluster.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(false)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-900">Status</label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDraftFilters(prev => ({ ...prev, status: toggleArrayFilter(prev.status, 'all', POD_STATUSES.length) }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.status.length === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {draftFilters.status.length === 0 && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                  All
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
                <label className="block text-sm font-semibold text-gray-900">Cluster</label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDraftFilters(prev => ({ ...prev, cluster_id: toggleArrayFilter(prev.cluster_id, 'all', clusters.length) }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.cluster_id.length === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {draftFilters.cluster_id.length === 0 && <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />}
                  All Clusters
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
          </div>

          <div className="px-6 py-5 border-t border-gray-100 bg-white flex items-center justify-between gap-3 lg:rounded-b-xl">
            <button
              type="button"
              onClick={resetDraftFilters}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className={`fixed inset-0 z-50 ${isDetailOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isDetailOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isDetailOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeDetailModal}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-[960px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl flex flex-col ${isDetailOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pod Details</h2>
            </div>
            <button
              type="button"
              onClick={closeDetailModal}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isDetailLoading ? (
              <div className="py-8 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-20" />
                Loading pod details...
              </div>
            ) : !detailPod ? (
              <div className="py-8 text-center text-gray-500">No details found for this pod.</div>
            ) : (
              <div className="space-y-8">
                {/* Header Status Section */}
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border-2 ${getPodStatusBorderColor(detailPod.status)}`}>
                      <LayoutTemplate className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-gray-900">{detailPod.code}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(detailPod.status)}`}>
                          {detailPod.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mt-0.5">{detailPod.name}</p>
                    </div>
                  </div>

                  {detailPod.status === 'MAINTENANCE' && detailPod.maintenance_status && (
                    <div className="bg-rose-50 text-rose-700 px-4 py-2 rounded-xl border border-rose-100 text-xs font-medium max-w-xs">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Wrench className="w-3.5 h-3.5" />
                        <span className="font-bold uppercase tracking-wide">Maintenance Note</span>
                      </div>
                      {detailPod.maintenance_status}
                    </div>
                  )}
                </div>

                {/* Primary Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Location Info</h4>
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-500">
                          <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                            <Boxes className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight">Cluster</span>
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
                          <span className="text-xs font-bold uppercase tracking-tight">Level</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {getLevel(detailPod.code) === 'U' ? 'Upper Floor (Tầng trên)' : 'Lower Floor (Tầng dưới)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Maintenance History</h4>
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-500">
                          <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                            <History className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight">Last Cleaned</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {detailPod.last_cleaned_at ? new Date(detailPod.last_cleaned_at).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-500">
                          <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                            <Clock className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight">Added Date</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {detailPod.createdAt ? new Date(detailPod.createdAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Specs Grid */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Technical Specifications</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-indigo-200 transition-colors">
                      <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Soundproof</span>
                      <span className="text-sm font-black text-gray-900 mt-1">{detailPod.soundproof_level}/5</span>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-cyan-200 transition-colors">
                      <div className="p-3 bg-cyan-50 text-cyan-500 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                        <Wind className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Ventilation</span>
                      <span className="text-sm font-black text-gray-900 mt-1">{detailPod.ventilation_level}/5</span>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-amber-200 transition-colors">
                      <div className="p-3 bg-amber-50 text-amber-500 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                        <Zap className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Outlets</span>
                      <span className="text-sm font-black text-gray-900 mt-1">{detailPod.power_outlets} ports</span>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-emerald-200 transition-colors">
                      <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                        <Wifi className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Wi-Fi</span>
                      <span className="text-sm font-black text-gray-900 mt-1">{detailPod.wifi_available ? 'Available' : 'No'}</span>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-violet-200 transition-colors">
                      <div className="p-3 bg-violet-50 text-violet-500 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                        <Timer className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Max Session</span>
                      <span className="text-sm font-black text-gray-900 mt-1">{detailPod.max_session_duration}m</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {detailPod.description && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Detailed Description</h4>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                      <p className="text-sm text-gray-600 leading-relaxed italic">
                        "{detailPod.description}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isStatusModalOpen}
        onClose={closeStatusModal}
        title={statusPod ? `Update Status - ${statusPod.code}` : 'Update Pod Status'}
        size="md"
        footer={(
          <>
            <button
              onClick={closeStatusModal}
              disabled={isStatusSaving}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateStatus}
              disabled={isStatusSaving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isStatusSaving ? 'Updating...' : 'Update Status'}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Reason</label>
              <textarea
                rows={3}
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                placeholder="Describe maintenance issue"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isAssignModalOpen}
        onClose={closeAssignModal}
        title={assignPod ? `Assign Cleaner - ${assignPod.code}` : 'Assign Cleaner'}
        size="md"
        footer={(
          <>
            <button
              onClick={closeAssignModal}
              disabled={isAssigning}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignCleaner}
              disabled={isAssigning || !selectedCleaner}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAssigning ? 'Assigning...' : 'Assign Task'}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a cleaner to create a cleaning task for pod <strong>{assignPod?.name}</strong>.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cleaner</label>
            <select
              value={selectedCleaner}
              onChange={(e) => setSelectedCleaner(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
            >
              <option value="" disabled>-- Select a cleaner --</option>
              {cleaners.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
