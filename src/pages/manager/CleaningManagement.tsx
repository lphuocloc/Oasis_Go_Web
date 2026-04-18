import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Eye, Wrench } from 'lucide-react'
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

export const CleaningManagement = () => {
  const { clusters, refreshScope } = useManagerScope()
  const [tasks, setTasks] = useState<MaintenanceTaskItem[]>([])
  const [pods, setPods] = useState<PodItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clusterFilter, setClusterFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<MaintenanceTaskStatus[]>([])

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
  }, [clusterFilter, statusFilter, clusters])

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
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Management</h1>
          <p className="text-gray-500 mt-1">Track and update escalated pod maintenance tasks.</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Total Tasks</p>
            <Wrench className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{tasks.length}</p>
        </div>
        {MAINTENANCE_TASK_STATUSES.map((status) => (
          <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500">{status}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{taskStats[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex flex-col gap-5">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2.5">Status</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter.length === 0 ? [] : toggleArrayFilter(statusFilter, 'all', MAINTENANCE_TASK_STATUSES.length))}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${statusFilter.length === 0 ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              All
            </button>
            {MAINTENANCE_TASK_STATUSES.map((status) => {
              const isSelected = statusFilter.includes(status)
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(toggleArrayFilter(statusFilter, status, MAINTENANCE_TASK_STATUSES.length))}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {status}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2.5">Clusters</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setClusterFilter(clusterFilter.length === 0 ? [] : toggleArrayFilter(clusterFilter, 'all', clusters.length))}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${clusterFilter.length === 0 ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              All Clusters
            </button>
            {clusters.map((cluster) => {
              const isSelected = clusterFilter.includes(cluster.id)
              return (
                <button
                  key={cluster.id}
                  type="button"
                  onClick={() => setClusterFilter(toggleArrayFilter(clusterFilter, cluster.id, clusters.length))}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {cluster.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Task Info</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Pod Details</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Status</th>
                <th className="px-6 py-4 text-left font-medium text-gray-500">Created At</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading maintenance tasks...</td></tr>
              ) : filteredTasks.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No tasks found</td></tr>
              ) : (
                filteredTasks.map((task) => {
                  const pod = podMap.get(task.pod_id)
                  const cluster = pod ? clusterMap.get(pod.cluster_id) : null
                  return (
                    <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-gray-900 line-clamp-2 max-w-xs">{task.description || 'No description'}</p>
                        <p className="text-xs text-gray-400 mt-1 font-mono">ID: {task.id.split('-')[0]}...</p>
                        {task.incident_id && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-bold uppercase rounded-full border border-orange-200">From Incident</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-gray-900">{pod?.name || 'Unknown Pod'}</p>
                        <p className="text-xs text-gray-500">{cluster?.name || 'Unknown Cluster'}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-gray-500">
                        {new Date(task.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailModal(task)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors tooltip-trigger"
                            title="View Details"
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
      <Modal isOpen={isDetailOpen} onClose={closeDetailModal} title="Maintenance Task Details" size="lg">
        {isDetailLoading || !detailTask ? (
          <div className="py-12 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Task Status</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeClass(detailTask.status)}`}>
                    {detailTask.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { closeDetailModal(); openStatusModal(detailTask); }}
                  className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Update Status
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pod Information</p>
                <p className="text-sm font-medium text-gray-900">{podMap.get(detailTask.pod_id)?.name || detailTask.pod_id}</p>
                <p className="text-xs text-gray-500">{clusterMap.get(podMap.get(detailTask.pod_id)?.cluster_id || '')?.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created By</p>
                <p className="text-sm font-medium text-gray-900 font-mono break-all">{detailTask.reported_by}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Created</p>
                <p className="text-sm text-gray-900">{new Date(detailTask.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Source Context</p>
                {detailTask.incident_id && <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">Incident ID: {detailTask.incident_id.split('-')[0]}</p>}
                {!detailTask.incident_id && <p className="text-xs text-gray-500">Directly Assigned</p>}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Issue Description</p>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-800 text-sm whitespace-pre-wrap">
                {detailTask.description || 'No description provided.'}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={() => !isStatusSaving && setIsStatusModalOpen(false)} title="Update Maintenance Task Status" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as MaintenanceTaskStatus)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            >
              {MAINTENANCE_TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button disabled={isStatusSaving} onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancel</button>
            <button disabled={isStatusSaving} onClick={handleUpdateStatus} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium">
              {isStatusSaving ? 'Saving...' : 'Save Status'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
