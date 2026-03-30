import { useEffect, useMemo, useState } from 'react'
import { Boxes, Edit2, Eye, RefreshCw, Search } from 'lucide-react'
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

export const PodManagement = () => {
  const { clusters, isLoading: isScopeLoading, refreshScope } = useManagerScope()
  const [pods, setPods] = useState<PodItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clusterFilter, setClusterFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | PodStatus>('all')

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
        cluster_id: clusterFilter === 'all' ? undefined : clusterFilter,
        status: statusFilter === 'all' ? undefined : statusFilter
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
  }, [clusterFilter, statusFilter])

  useEffect(() => {
    if (clusterFilter === 'all') return
    if (clusters.some((cluster) => cluster.id === clusterFilter)) return
    setClusterFilter('all')
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

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pod Management</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Total Pods</p>
            <Boxes className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{pods.length}</p>
        </div>
        {POD_STATUSES.map((status) => (
          <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500">{status}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{podStats[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr_0.8fr] gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, name, id or cluster..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            disabled={isScopeLoading}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All clusters</option>
            {clusters.map((cluster) => (
              <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | PodStatus)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All statuses</option>
            {POD_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Pods</h2>
          <span className="text-sm text-gray-500">{filteredPods.length} item(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pod</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cluster</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Cleaned</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isTableLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading pods...</td>
                </tr>
              ) : filteredPods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No pods found in your scope</td>
                </tr>
              ) : (
                filteredPods.map((pod) => (
                  <tr key={pod.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold text-gray-900">{pod.code} - {pod.name}</div>
                      <div className="text-xs text-gray-500 mt-1 break-all">{pod.id}</div>
                      {pod.description && <p className="text-xs text-gray-500 mt-2 max-w-sm">{pod.description}</p>}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">{clusterMap.get(pod.cluster_id)?.name ?? pod.cluster?.name ?? pod.cluster_id}</td>
                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(pod.status)}`}>
                        {pod.status}
                      </span>
                      {pod.status === 'MAINTENANCE' && pod.maintenance_status && (
                        <p className="text-xs text-rose-700 mt-2">{pod.maintenance_status}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-gray-600">
                      <p>Soundproof: {pod.soundproof_level}/5</p>
                      <p>Ventilation: {pod.ventilation_level}/5</p>
                      <p>Outlets: {pod.power_outlets}</p>
                      <p>Wi-Fi: {pod.wifi_available ? 'Yes' : 'No'}</p>
                      <p>Max session: {pod.max_session_duration} mins</p>
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">
                      {pod.last_cleaned_at ? new Date(pod.last_cleaned_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {pod.status === 'NEEDS_CLEANING' && (
                          <button
                            type="button"
                            onClick={() => openAssignModal(pod)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                          >
                            Assign Cleaner
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openDetailModal(pod.id)}
                          disabled={detailLoadingId === pod.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-60"
                        >
                          <Eye className="w-4 h-4" />
                          {detailLoadingId === pod.id ? 'Loading...' : 'Details'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openStatusModal(pod)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Update Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isDetailOpen}
        onClose={closeDetailModal}
        title="Pod Details"
        size="xl"
      >
        {isDetailLoading ? (
          <div className="py-8 text-center text-gray-500">Loading pod details...</div>
        ) : !detailPod ? (
          <div className="py-8 text-center text-gray-500">No details found for this pod.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Pod ID</p>
                <p className="font-medium text-gray-900 break-all">{detailPod.id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Pod Code</p>
                <p className="font-medium text-gray-900">{detailPod.code}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Pod Name</p>
                <p className="font-medium text-gray-900">{detailPod.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(detailPod.status)}`}>
                  {detailPod.status}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Cluster</p>
                <p className="font-medium text-gray-900">{detailPod.cluster?.name ?? clusterMap.get(detailPod.cluster_id)?.name ?? detailPod.cluster_id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Location</p>
                <p className="font-medium text-gray-900">{detailPod.cluster?.location?.name ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Soundproof</p>
                <p className="font-medium text-gray-900">{detailPod.soundproof_level}/5</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Ventilation</p>
                <p className="font-medium text-gray-900">{detailPod.ventilation_level}/5</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Power Outlets</p>
                <p className="font-medium text-gray-900">{detailPod.power_outlets}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Wi-Fi</p>
                <p className="font-medium text-gray-900">{detailPod.wifi_available ? 'Available' : 'Unavailable'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Max Session Duration</p>
                <p className="font-medium text-gray-900">{detailPod.max_session_duration} minutes</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Last Cleaned</p>
                <p className="font-medium text-gray-900">{detailPod.last_cleaned_at ? new Date(detailPod.last_cleaned_at).toLocaleString() : '-'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Description</p>
              <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-3">
                {detailPod.description || 'No description'}
              </p>
            </div>

            {detailPod.status === 'MAINTENANCE' && detailPod.maintenance_status && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Maintenance Reason</p>
                <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3">
                  {detailPod.maintenance_status}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

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
