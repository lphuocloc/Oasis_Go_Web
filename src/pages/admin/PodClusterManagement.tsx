/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  Trash2
} from 'lucide-react'
import { toast } from 'react-toastify'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table'
import {
  type PodClusterImage,
  type PodClusterItem,
  type PodClusterPayload,
  type PodClusterPricingSummary
} from '../../api/lib/podClusterApi'
import { podApi, type PodItem } from '../../api/lib/podApi'
import { initUserSocket } from '../../lib/socket'
import { ClusterPodItemBulkAssign } from '../../components/common/ClusterPodItemBulkAssign'
import { PodGridSelector, type PodGridItem } from '../../components/common/PodGridSelector'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  clearPodClusterImages,
  clearPodClustersError,
  selectPodClusterImagesByClusterId,
  selectPodClusterImagesLoadingByClusterId,
  selectPodClusterLocationFilter,
  selectPodClusterLocations,
  selectPodClusters,
  selectPodClustersError,
  selectPodClustersLoading,
  selectPodClustersSaving,
  setPodClusterLocationFilter
} from '../../store/slices/podClustersSlice'
import {
  createPodCluster,
  deletePodCluster,
  deletePodClusterImage,
  fetchPodClusterImages,
  fetchPodClusterLocations,
  fetchPodClusters,
  updatePodCluster
} from '../../store/thunks/podClusterThunks'

interface PodClusterFormState {
  location_id: string
  name: string
  description: string
  base_price_modifier: string
  slot_duration_minutes: string
  images: File[]
}

const createEmptyForm = (): PodClusterFormState => ({
  location_id: '',
  name: '',
  description: '',
  base_price_modifier: '1',
  slot_duration_minutes: '0',
  images: []
})

const EMPTY_LOCATION_VALUE = '__NONE__'
const SLOT_DURATION_OPTIONS = [0, 30, 60, 90, 120] as const

const toFormState = (cluster: PodClusterItem): PodClusterFormState => ({
  location_id: cluster.location_id,
  name: cluster.name,
  description: cluster.description ?? '',
  base_price_modifier: cluster.base_price_modifier == null ? '1' : String(cluster.base_price_modifier),
  slot_duration_minutes: cluster.slot_duration_minutes == null ? '0' : String(cluster.slot_duration_minutes),
  images: []
})

const toPayload = (form: PodClusterFormState): PodClusterPayload => ({
  location_id: form.location_id,
  name: form.name.trim(),
  description: form.description.trim() || null,
  base_price_modifier: form.base_price_modifier.trim() === '' ? null : Number(form.base_price_modifier),
  slot_duration_minutes: Number(form.slot_duration_minutes),
  images: form.images
})

const formatMoneyModifier = (value?: number | null) => {
  if (value == null) return '—'
  return `${value.toFixed(2)}x`
}

const formatSlotDuration = (value?: number | null) => {
  if (value == null) return '—'
  return `${value} min`
}

const formatUtcDateTime = (value?: string | null) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

const PodClusterTableSkeletonRow = ({ columns = 6 }: { columns?: number }) => (
  <TableRow className="animate-pulse">
    {Array.from({ length: columns }).map((_, index) => (
      <TableCell key={index} className="px-6 py-4">
        <div className="h-4 w-full max-w-[10rem] rounded bg-gray-200" />
      </TableCell>
    ))}
  </TableRow>
)

export const PodClusterManagement = () => {
  const dispatch = useAppDispatch()
  const clusters = useAppSelector(selectPodClusters)
  const locations = useAppSelector(selectPodClusterLocations)
  const imagesByClusterId = useAppSelector(selectPodClusterImagesByClusterId)
  const imagesLoadingByClusterId = useAppSelector(selectPodClusterImagesLoadingByClusterId)
  const isLoading = useAppSelector(selectPodClustersLoading)
  const isSaving = useAppSelector(selectPodClustersSaving)
  const clustersError = useAppSelector(selectPodClustersError)
  const locationFilter = useAppSelector(selectPodClusterLocationFilter)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [editingCluster, setEditingCluster] = useState<PodClusterItem | null>(null)
  const [selectedPricingCluster, setSelectedPricingCluster] = useState<PodClusterItem | null>(null)
  const [selectedPodsCluster, setSelectedPodsCluster] = useState<PodClusterItem | null>(null)
  const [clusterPods, setClusterPods] = useState<PodItem[]>([])
  const [isPodsLoading, setIsPodsLoading] = useState(false)
  const [form, setForm] = useState<PodClusterFormState>(createEmptyForm())
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const images = editingCluster ? (imagesByClusterId[editingCluster.id] ?? []) : []
  const isImagesLoading = editingCluster ? (imagesLoadingByClusterId[editingCluster.id] ?? false) : false

  useEffect(() => {
    void dispatch(fetchPodClusterLocations())
  }, [dispatch])

  useEffect(() => {
    void dispatch(fetchPodClusters(locationFilter))
  }, [dispatch, locationFilter, refreshTrigger])

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
    if (!clustersError) return

    toast.error(clustersError)
    dispatch(clearPodClustersError())
  }, [clustersError, dispatch])

  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  )

  const filteredClusters = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return clusters

    return clusters.filter((cluster) => {
      const locationName = locationMap.get(cluster.location_id)?.name ?? ''
      return [cluster.name, cluster.id, cluster.description ?? '', locationName]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [clusters, locationMap, search])


  const imagePreviewUrls = useMemo(
    () => form.images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [form.images]
  )

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [imagePreviewUrls])

  const openCreateModal = () => {
    setEditingCluster(null)
    setForm({ ...createEmptyForm(), location_id: locations[0]?.id ?? '' })
    setIsModalOpen(true)
  }

  const openEditModal = async (cluster: PodClusterItem) => {
    setEditingCluster(cluster)
    setForm(toFormState(cluster))
    setIsModalOpen(true)
    await dispatch(fetchPodClusterImages(cluster.id))
  }

  const closeModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    if (editingCluster) {
      dispatch(clearPodClusterImages(editingCluster.id))
    }
    setEditingCluster(null)
    setForm(createEmptyForm())
  }



  const closeAssignModal = () => {
    setIsAssignModalOpen(false)
  }

  const openPodsModal = async (cluster: PodClusterItem) => {
    setSelectedPodsCluster(cluster)
    setIsPodsLoading(true)
    try {
      const response = await podApi.getByCluster(cluster.id)
      setClusterPods(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load pods')
      setClusterPods([])
    } finally {
      setIsPodsLoading(false)
    }
  }

  const closePodsModal = () => {
    setSelectedPodsCluster(null)
    setClusterPods([])
    setIsPodsLoading(false)
  }

  const updateForm = <K extends keyof PodClusterFormState>(key: K, value: PodClusterFormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? [])
    updateForm('images', nextFiles)
  }

  const removeSelectedFile = (index: number) => {
    updateForm('images', form.images.filter((_, fileIndex) => fileIndex !== index))
  }

  const validateForm = () => {
    if (!form.location_id) {
      toast.error('Location is required')
      return false
    }

    if (!form.name.trim()) {
      toast.error('Cluster name is required')
      return false
    }

    if (form.base_price_modifier.trim() !== '') {
      const modifier = Number(form.base_price_modifier)
      if (Number.isNaN(modifier) || modifier < 0) {
        toast.error('Base price modifier must be a non-negative number')
        return false
      }
    }

    if (!SLOT_DURATION_OPTIONS.includes(Number(form.slot_duration_minutes) as (typeof SLOT_DURATION_OPTIONS)[number])) {
      toast.error('Slot duration must be one of: 0, 30, 60, 90, 120')
      return false
    }

    if (form.images.length > 10) {
      toast.error('You can upload up to 10 images')
      return false
    }

    return true
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) return

    try {
      const payload = toPayload(form)

      if (editingCluster) {
        await dispatch(updatePodCluster({ id: editingCluster.id, payload })).unwrap()
        toast.success('Pod cluster updated successfully')
      } else {
        await dispatch(createPodCluster(payload)).unwrap()
        toast.success('Pod cluster created successfully')
      }

      closeModal()
      await dispatch(fetchPodClusters(locationFilter)).unwrap()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save pod cluster')
    } finally {
      // handled by redux
    }
  }

  const handleDeleteCluster = async (cluster: PodClusterItem) => {
    const confirmed = window.confirm(`Delete pod cluster "${cluster.name}"?`)
    if (!confirmed) return

    try {
      await dispatch(deletePodCluster(cluster.id)).unwrap()
      toast.success('Pod cluster deleted successfully')
      await dispatch(fetchPodClusters(locationFilter)).unwrap()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete pod cluster')
    }
  }

  const handleDeleteImage = async (image: PodClusterImage) => {
    if (!editingCluster) return

    const confirmed = window.confirm('Delete this image?')
    if (!confirmed) return

    try {
      await dispatch(deletePodClusterImage({ clusterId: editingCluster.id, imageId: image.id })).unwrap()
      toast.success('Image deleted successfully')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete image')
    }
  }

  const hasActivePricingRule = (cluster: PodClusterItem) => {
    return Boolean(cluster.pricing_summary?.has_location_rule && cluster.pricing_summary?.effective_rule)
  }

  const openPricingSummaryModal = (cluster: PodClusterItem) => {
    if (!hasActivePricingRule(cluster)) return
    setSelectedPricingCluster(cluster)
  }

  const closePricingSummaryModal = () => {
    setSelectedPricingCluster(null)
  }

  const selectedPricingSummary: PodClusterPricingSummary | null = selectedPricingCluster?.pricing_summary ?? null
  const podsGridItems = useMemo<PodGridItem[]>(() => {
    if (!selectedPodsCluster) return []
    return clusterPods.map((pod) => ({
      id: pod.id,
      code: pod.code,
      name: pod.name,
      status: pod.status,
      clusterName: selectedPodsCluster.name,
      isSelectable: false
    }))
  }, [clusterPods, selectedPodsCluster])

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản Lý Cụm Pod</h1>
          <p className="text-gray-500 mt-1">Quản lý các nhóm cụm pod, hệ số giá và thư viện hình ảnh cho từng vị trí.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              void dispatch(fetchPodClusters(locationFilter))
            }}
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={openCreateModal}
          >
            <Plus className="w-4 h-4" />
            Add Pod Cluster
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Tổng Cụm Pod</span>
            <Boxes className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{clusters.length}</div>
        </div>


      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, id or location..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <Select
            value={locationFilter}
            onValueChange={(value) => dispatch(setPodClusterLocationFilter(value))}
          >
            <SelectTrigger className="px-4 py-2.5">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Cụm Pod</h2>
          <span className="text-sm text-gray-500">{filteredClusters.length} item(s)</span>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <TableRow>
                <TableHead className="px-6 py-3 font-medium">Cụm Pod</TableHead>
                <TableHead className="px-6 py-3 font-medium">Vị trí</TableHead>
                <TableHead className="px-5 py-3 font-medium">Hệ số giá</TableHead>
                <TableHead className="px-6 py-3 font-medium">Thời lượng slot</TableHead>
                <TableHead className="px-6 py-3 font-medium">Quy luật giá</TableHead>
                <TableHead className="px-6 py-3 text-right font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <PodClusterTableSkeletonRow key={`pod-cluster-skeleton-${index}`} columns={6} />
                ))
              ) : filteredClusters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-6 py-12 text-center text-gray-400">No pod clusters found</TableCell>
                </TableRow>
              ) : (
                filteredClusters.map((cluster) => (
                  <TableRow
                    key={cluster.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openPodsModal(cluster)}
                  >
                    <TableCell className="px-6 py-4 align-top">
                      <div className="font-semibold text-gray-900">{cluster.name}</div>
                      {cluster.description && (
                        <p className="text-xs text-gray-500 mt-2 max-w-md">{cluster.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 align-top text-gray-600">{locationMap.get(cluster.location_id)?.name ?? cluster.location_id}</TableCell>
                    <TableCell className="px-6 py-4 align-top text-gray-700 font-medium">{formatMoneyModifier(cluster.base_price_modifier)}</TableCell>
                    <TableCell className="px-6 py-4 align-top text-gray-700 font-medium">{formatSlotDuration(cluster.slot_duration_minutes)}</TableCell>
                    <TableCell className="px-6 py-4 align-top">
                      {hasActivePricingRule(cluster) ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openPricingSummaryModal(cluster)
                          }}
                          className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800"
                          aria-label={`View pricing rule for ${cluster.name}`}
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          Đang áp dụng
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-sm text-slate-400">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                          Không có
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={(event) => {
                            event.stopPropagation()
                            void openEditModal(cluster)
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDeleteCluster(cluster)
                          }}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open: boolean) => {
          if (!open) closeModal()
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingCluster ? 'Edit Pod Cluster' : 'Add Pod Cluster'}</DialogTitle>
            <DialogDescription className="sr-only">
              Form to {editingCluster ? 'edit' : 'create'} pod cluster.
            </DialogDescription>
          </DialogHeader>

          <form id="pod-cluster-form" onSubmit={handleSubmit} className="space-y-5 px-6 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <Select
                  value={form.location_id || EMPTY_LOCATION_VALUE}
                  onValueChange={(value) => updateForm('location_id', value === EMPTY_LOCATION_VALUE ? '' : value)}
                >
                  <SelectTrigger className="w-full px-4 py-2.5">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_LOCATION_VALUE}>Select a location</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cluster Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="Cluster A - Premium Zone"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Price Modifier</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.base_price_modifier}
                  onChange={(e) => updateForm('base_price_modifier', e.target.value)}
                  placeholder="1.50"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slot Duration (minutes)</label>
                <Select
                  value={form.slot_duration_minutes}
                  onValueChange={(value) => updateForm('slot_duration_minutes', value)}
                >
                  <SelectTrigger className="w-full px-4 py-2.5">
                    <SelectValue placeholder="Select slot duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOT_DURATION_OPTIONS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {minutes} phút
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFilesChange}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-2">You can upload up to 10 images per request.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={4}
                placeholder="High-end pod cluster with premium amenities"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {form.images.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">New Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviewUrls.map((item, index) => (
                    <div key={`${item.file.name}-${index}`} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={item.url} alt={item.file.name} className="w-full h-28 object-cover" />
                      <Button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-7 px-2 text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editingCluster && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Existing Images</h3>
                {isImagesLoading ? (
                  <p className="text-sm text-gray-400">Loading images...</p>
                ) : images.length === 0 ? (
                  <p className="text-sm text-gray-400">This cluster has no images yet.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image) => (
                      <div key={image.id} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={image.image_url} alt={image.id} className="w-full h-28 object-cover" />
                        <Button
                          type="button"
                          onClick={() => handleDeleteImage(image)}
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-7 px-2 text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          <DialogFooter>
            <Button
              onClick={closeModal}
              disabled={isSaving}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="pod-cluster-form"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : editingCluster ? 'Save Changes' : 'Create Pod Cluster'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAssignModalOpen}
        onOpenChange={(open: boolean) => {
          if (!open) closeAssignModal()
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Assign Items By Pod Cluster</DialogTitle>
            <DialogDescription className="sr-only">
              Assign items in bulk by pod cluster.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <ClusterPodItemBulkAssign clusters={clusters} isLoadingClusters={isLoading} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedPricingCluster)}
        onOpenChange={(open: boolean) => {
          if (!open) closePricingSummaryModal()
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thông Tin Quy Luật Giá</DialogTitle>
            <DialogDescription>
              {selectedPricingCluster?.name ?? 'Pod cluster'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            {!selectedPricingSummary ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Không tìm thấy dữ liệu quy luật giá.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thời Điểm Truy Vấn</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatUtcDateTime(selectedPricingSummary.queried_at_utc)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Có Quy Luật Theo Vị Trí</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{selectedPricingSummary.has_location_rule ? 'Có' : 'Không'}</p>
                  </div>
                </div>

                {selectedPricingSummary.effective_rule ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="text-sm font-semibold text-slate-900">Quy Luật Đang Áp Dụng</h4>
                    <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-slate-500">Phạm Vi</dt>
                        <dd className="font-medium text-slate-900">{selectedPricingSummary.effective_rule.scope}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Hệ Số</dt>
                        <dd className="font-medium text-slate-900">{selectedPricingSummary.effective_rule.multiplier}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Áp Dụng Hệ Số Giá</dt>
                        <dd className="font-medium text-slate-900">{selectedPricingSummary.effective_rule.applied_modifier}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Giờ Bắt Đầu</dt>
                        <dd className="font-medium text-slate-900">{selectedPricingSummary.effective_rule.start_time}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Giờ Kết Thúc</dt>
                        <dd className="font-medium text-slate-900">{selectedPricingSummary.effective_rule.end_time}</dd>
                      </div>
                    </dl>

                    <div className="mt-4">
                      <p className="text-slate-500 text-sm">Ngày Áp Dụng</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedPricingSummary.effective_rule.days_of_week.map((day) => (
                          <span
                            key={day}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Chưa có quy luật giá đang áp dụng.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePricingSummaryModal}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedPodsCluster)}
        onOpenChange={(open: boolean) => {
          if (!open) closePodsModal()
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Danh sách Pod</DialogTitle>
            <DialogDescription>
              {selectedPodsCluster?.name ?? 'Pod cluster'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            {isPodsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={`pod-skeleton-${index}`} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : podsGridItems.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Không tìm thấy pod nào trong cụm này.
              </div>
            ) : (
              <PodGridSelector
                pods={podsGridItems}
                selectedPodId={undefined}
                onSelect={() => { }}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePodsModal}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}