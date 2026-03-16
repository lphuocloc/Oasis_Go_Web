import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Edit2, Plus, RefreshCw, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import { podClusterApi, type PodClusterItem } from '../../api/lib/admin/podClusterApi'
import { PodModulesPanel } from '../../components/admin/PodModulesPanel'
import {
  POD_STATUSES,
  podApi,
  type CreatePodsPayload,
  type PodItem,
  type PodStatus,
  type UpdatePodPayload
} from '../../api/lib/admin/podApi'

type CreateMode = 'single' | 'grid'

interface PodCreateFormState {
  cluster_id: string
  code: string
  name: string
  description: string
  numRows: string
  numCols: string
  soundproof_level: string
  ventilation_level: string
  power_outlets: string
  wifi_available: boolean
  max_session_duration: string
}

interface PodEditFormState {
  name: string
  description: string
  status: PodStatus
  maintenance_status: string
  soundproof_level: string
  ventilation_level: string
  power_outlets: string
  wifi_available: boolean
  max_session_duration: string
}

const DEFAULT_CREATE_FORM: PodCreateFormState = {
  cluster_id: '',
  code: '',
  name: '',
  description: '',
  numRows: '1',
  numCols: '1',
  soundproof_level: '3',
  ventilation_level: '3',
  power_outlets: '2',
  wifi_available: true,
  max_session_duration: '480'
}

const toEditForm = (pod: PodItem): PodEditFormState => ({
  name: pod.name,
  description: pod.description ?? '',
  status: pod.status,
  maintenance_status: pod.maintenance_status ?? '',
  soundproof_level: String(pod.soundproof_level),
  ventilation_level: String(pod.ventilation_level),
  power_outlets: String(pod.power_outlets),
  wifi_available: pod.wifi_available,
  max_session_duration: String(pod.max_session_duration)
})

const statusBadgeClass = (status: PodStatus) => {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-50 text-emerald-700'
    case 'OCCUPIED':
      return 'bg-blue-50 text-blue-700'
    case 'NEEDS_CLEANING':
      return 'bg-amber-50 text-amber-700'
    case 'CLEANING':
      return 'bg-purple-50 text-purple-700'
    case 'MAINTENANCE':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export const AdminPodManagement = () => {
  const [pods, setPods] = useState<PodItem[]>([])
  const [clusters, setClusters] = useState<PodClusterItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PodStatus>('all')
  const [clusterFilter, setClusterFilter] = useState('all')
  const [selectedPodId, setSelectedPodId] = useState<string | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode>('single')
  const [createForm, setCreateForm] = useState<PodCreateFormState>(DEFAULT_CREATE_FORM)
  const [isCreating, setIsCreating] = useState(false)

  const [editingPod, setEditingPod] = useState<PodItem | null>(null)
  const [editForm, setEditForm] = useState<PodEditFormState | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const fetchClusters = async () => {
    const response = await podClusterApi.getAll()
    setClusters(response.data)
  }

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
    const init = async () => {
      try {
        await Promise.all([fetchClusters(), fetchPods()])
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to initialize pod data')
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterFilter, statusFilter])

  const clusterMap = useMemo(
    () => new Map(clusters.map((cluster) => [cluster.id, cluster])),
    [clusters]
  )

  const filteredPods = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return pods

    return pods.filter((pod) => {
      const clusterName = clusterMap.get(pod.cluster_id)?.name ?? ''
      return [pod.code, pod.name, pod.id, clusterName, pod.status]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [clusterMap, pods, search])

  const podsByStatus = useMemo(
    () => pods.reduce<Record<string, number>>((acc, pod) => {
      const key = pod.status || 'UNKNOWN'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
    [pods]
  )

  const selectedPod = useMemo(
    () => pods.find((pod) => pod.id === selectedPodId) ?? null,
    [pods, selectedPodId]
  )

  const openCreateModal = () => {
    setCreateMode('single')
    setCreateForm({
      ...DEFAULT_CREATE_FORM,
      cluster_id: clusters[0]?.id ?? ''
    })
    setIsCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    if (isCreating) return
    setIsCreateModalOpen(false)
    setCreateMode('single')
    setCreateForm(DEFAULT_CREATE_FORM)
  }

  const updateCreateForm = <K extends keyof PodCreateFormState>(key: K, value: PodCreateFormState[K]) => {
    setCreateForm((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const updateEditForm = <K extends keyof PodEditFormState>(key: K, value: PodEditFormState[K]) => {
    if (!editForm) return
    setEditForm((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [key]: value
      }
    })
  }

  const validateCommonNumbers = (form: PodCreateFormState | PodEditFormState) => {
    const soundproof = Number(form.soundproof_level)
    const ventilation = Number(form.ventilation_level)
    const outlets = Number(form.power_outlets)
    const duration = Number(form.max_session_duration)

    if (Number.isNaN(soundproof) || soundproof < 1 || soundproof > 5) {
      toast.error('Soundproof level must be between 1 and 5')
      return false
    }
    if (Number.isNaN(ventilation) || ventilation < 1 || ventilation > 5) {
      toast.error('Ventilation level must be between 1 and 5')
      return false
    }
    if (Number.isNaN(outlets) || outlets < 0) {
      toast.error('Power outlets must be 0 or greater')
      return false
    }
    if (Number.isNaN(duration) || duration < 60) {
      toast.error('Max session duration must be at least 60 minutes')
      return false
    }

    return true
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!createForm.cluster_id) {
      toast.error('Cluster is required')
      return
    }

    if (!validateCommonNumbers(createForm)) return

    let payload: CreatePodsPayload

    if (createMode === 'single') {
      if (!createForm.code.trim()) {
        toast.error('Pod code is required for single mode')
        return
      }
      if (!createForm.name.trim()) {
        toast.error('Pod name is required for single mode')
        return
      }

      payload = {
        cluster_id: createForm.cluster_id,
        code: createForm.code.trim().toUpperCase(),
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        soundproof_level: Number(createForm.soundproof_level),
        ventilation_level: Number(createForm.ventilation_level),
        power_outlets: Number(createForm.power_outlets),
        wifi_available: createForm.wifi_available,
        max_session_duration: Number(createForm.max_session_duration)
      }
    } else {
      const numRows = Number(createForm.numRows)
      const numCols = Number(createForm.numCols)

      if (Number.isNaN(numRows) || numRows < 1 || numRows > 10) {
        toast.error('Rows must be between 1 and 10')
        return
      }
      if (Number.isNaN(numCols) || numCols < 1 || numCols > 20) {
        toast.error('Columns must be between 1 and 20')
        return
      }

      payload = {
        cluster_id: createForm.cluster_id,
        numRows,
        numCols,
        name: createForm.name.trim() || undefined,
        description: createForm.description.trim() || undefined,
        soundproof_level: Number(createForm.soundproof_level),
        ventilation_level: Number(createForm.ventilation_level),
        power_outlets: Number(createForm.power_outlets),
        wifi_available: createForm.wifi_available,
        max_session_duration: Number(createForm.max_session_duration)
      }
    }

    try {
      setIsCreating(true)
      const response = await podApi.createPods(payload)
      toast.success(response.message || `Created ${response.count} pod(s)`) 
      closeCreateModal()
      await fetchPods()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create pod(s)')
    } finally {
      setIsCreating(false)
    }
  }

  const openEditModal = (pod: PodItem) => {
    setEditingPod(pod)
    setEditForm(toEditForm(pod))
  }

  const closeEditModal = () => {
    if (isEditing) return
    setEditingPod(null)
    setEditForm(null)
  }

  const handleUpdatePod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingPod || !editForm) return

    if (!editForm.name.trim()) {
      toast.error('Pod name is required')
      return
    }

    if (editForm.status === 'MAINTENANCE' && !editForm.maintenance_status.trim()) {
      toast.error('Maintenance reason is required when status is MAINTENANCE')
      return
    }

    if (!validateCommonNumbers(editForm)) return

    const payload: UpdatePodPayload = {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      status: editForm.status,
      maintenance_status: editForm.status === 'MAINTENANCE' ? editForm.maintenance_status.trim() : null,
      soundproof_level: Number(editForm.soundproof_level),
      ventilation_level: Number(editForm.ventilation_level),
      power_outlets: Number(editForm.power_outlets),
      wifi_available: editForm.wifi_available,
      max_session_duration: Number(editForm.max_session_duration)
    }

    try {
      setIsEditing(true)
      await podApi.update(editingPod.id, payload)
      toast.success('Pod updated successfully')
      closeEditModal()
      await fetchPods()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update pod')
    } finally {
      setIsEditing(false)
    }
  }

  const handleDelete = async (pod: PodItem) => {
    const confirmed = window.confirm(`Delete pod ${pod.code}?`)
    if (!confirmed) return

    try {
      await podApi.delete(pod.id)
      toast.success('Pod deleted successfully')
      await fetchPods()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete pod')
    }
  }

  const handleCompleteCleaning = async (pod: PodItem) => {
    try {
      await podApi.completeCleaning(pod.id)
      toast.success(`Pod ${pod.code} is now AVAILABLE`) 
      await fetchPods()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to complete cleaning')
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pod Management</h1>
          <p className="text-gray-500 mt-1">Create pods in grid or single mode and manage pod lifecycle status.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPods}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Pod(s)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500">Total Pods</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{pods.length}</p>
        </div>
        {POD_STATUSES.map((status) => (
          <div key={status} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500">{status}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{podsByStatus[status] ?? 0}</p>
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
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading pods...</td>
                </tr>
              ) : filteredPods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No pods found</td>
                </tr>
              ) : (
                filteredPods.map((pod) => (
                  <tr key={pod.id} className={`hover:bg-gray-50 transition-colors ${selectedPodId === pod.id ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold text-gray-900">{pod.code} - {pod.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{pod.id}</div>
                      {pod.description && <p className="text-xs text-gray-500 mt-2 max-w-sm">{pod.description}</p>}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">{clusterMap.get(pod.cluster_id)?.name ?? pod.cluster_id}</td>
                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(pod.status)}`}>
                        {pod.status}
                      </span>
                      {pod.maintenance_status && pod.status === 'MAINTENANCE' && (
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
                      {pod.last_cleaned_at ? new Date(pod.last_cleaned_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        {pod.status === 'CLEANING' && (
                          <button
                            onClick={() => handleCompleteCleaning(pod)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedPodId(pod.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                          Modules
                        </button>
                        <button
                          onClick={() => openEditModal(pod)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(pod)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
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

      <PodModulesPanel pod={selectedPod} onClose={() => setSelectedPodId(null)} />

      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Create Pod(s)"
        size="xl"
        footer={(
          <>
            <button
              onClick={closeCreateModal}
              disabled={isCreating}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="pod-create-form"
              disabled={isCreating}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isCreating ? 'Creating...' : createMode === 'single' ? 'Create Pod' : 'Create Grid Pods'}
            </button>
          </>
        )}
      >
        <form id="pod-create-form" onSubmit={handleCreate} className="space-y-5">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setCreateMode('single')}
              className={`px-3 py-1.5 rounded-md text-sm ${createMode === 'single' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
            >
              Single Mode
            </button>
            <button
              type="button"
              onClick={() => setCreateMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm ${createMode === 'grid' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
            >
              Grid Mode
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cluster</label>
              <select
                value={createForm.cluster_id}
                onChange={(e) => updateCreateForm('cluster_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select cluster</option>
                {clusters.map((cluster) => (
                  <option key={cluster.id} value={cluster.id}>{cluster.name}</option>
                ))}
              </select>
            </div>

            {createMode === 'single' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pod Code</label>
                  <input
                    type="text"
                    value={createForm.code}
                    onChange={(e) => updateCreateForm('code', e.target.value.toUpperCase())}
                    placeholder="A01L"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pod Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => updateCreateForm('name', e.target.value)}
                    placeholder="VIP Pod A01L"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rows (A, B, C...)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={createForm.numRows}
                    onChange={(e) => updateCreateForm('numRows', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cols (01, 02...)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={createForm.numCols}
                    onChange={(e) => updateCreateForm('numCols', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Name (optional)</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => updateCreateForm('name', e.target.value)}
                    placeholder="Premium Pod"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => updateCreateForm('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Soundproof (1-5)</label>
              <input type="number" min="1" max="5" value={createForm.soundproof_level} onChange={(e) => updateCreateForm('soundproof_level', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ventilation (1-5)</label>
              <input type="number" min="1" max="5" value={createForm.ventilation_level} onChange={(e) => updateCreateForm('ventilation_level', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Power Outlets</label>
              <input type="number" min="0" value={createForm.power_outlets} onChange={(e) => updateCreateForm('power_outlets', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Session (minutes)</label>
              <input type="number" min="60" value={createForm.max_session_duration} onChange={(e) => updateCreateForm('max_session_duration', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={createForm.wifi_available}
              onChange={(e) => updateCreateForm('wifi_available', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Wi-Fi available
          </label>
        </form>
      </Modal>

      <Modal
        isOpen={!!editingPod && !!editForm}
        onClose={closeEditModal}
        title={editingPod ? `Edit Pod ${editingPod.code}` : 'Edit Pod'}
        size="xl"
        footer={(
          <>
            <button
              onClick={closeEditModal}
              disabled={isEditing}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="pod-edit-form"
              disabled={isEditing}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isEditing ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        )}
      >
        {editForm && (
          <form id="pod-edit-form" onSubmit={handleUpdatePod} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pod Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => updateEditForm('name', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => updateEditForm('status', e.target.value as PodStatus)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {POD_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => updateEditForm('description', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {editForm.status === 'MAINTENANCE' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Status / Reason</label>
                  <input
                    type="text"
                    value={editForm.maintenance_status}
                    onChange={(e) => updateEditForm('maintenance_status', e.target.value)}
                    placeholder="Example: Air ventilation issue"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Soundproof (1-5)</label>
                <input type="number" min="1" max="5" value={editForm.soundproof_level} onChange={(e) => updateEditForm('soundproof_level', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ventilation (1-5)</label>
                <input type="number" min="1" max="5" value={editForm.ventilation_level} onChange={(e) => updateEditForm('ventilation_level', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Power Outlets</label>
                <input type="number" min="0" value={editForm.power_outlets} onChange={(e) => updateEditForm('power_outlets', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Session (minutes)</label>
                <input type="number" min="60" value={editForm.max_session_duration} onChange={(e) => updateEditForm('max_session_duration', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={editForm.wifi_available}
                onChange={(e) => updateEditForm('wifi_available', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Wi-Fi available
            </label>
          </form>
        )}
      </Modal>
    </div>
  )
}