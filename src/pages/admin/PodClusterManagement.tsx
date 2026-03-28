import React, { useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  Edit2,
  ImagePlus,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2
} from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import { locationApi, type LocationItem } from '../../api/lib/locationApi'
import {
  podClusterApi,
  type PodClusterImage,
  type PodClusterItem,
  type PodClusterPayload
} from '../../api/lib/podClusterApi'

interface PodClusterFormState {
  location_id: string
  name: string
  description: string
  base_price_modifier: string
  images: File[]
}

const createEmptyForm = (): PodClusterFormState => ({
  location_id: '',
  name: '',
  description: '',
  base_price_modifier: '1',
  images: []
})

const toFormState = (cluster: PodClusterItem): PodClusterFormState => ({
  location_id: cluster.location_id,
  name: cluster.name,
  description: cluster.description ?? '',
  base_price_modifier: cluster.base_price_modifier == null ? '1' : String(cluster.base_price_modifier),
  images: []
})

const toPayload = (form: PodClusterFormState): PodClusterPayload => ({
  location_id: form.location_id,
  name: form.name.trim(),
  description: form.description.trim() || null,
  base_price_modifier: form.base_price_modifier.trim() === '' ? null : Number(form.base_price_modifier),
  images: form.images
})

const formatMoneyModifier = (value?: number | null) => {
  if (value == null) return '—'
  return `${value.toFixed(2)}x`
}

export const PodClusterManagement = () => {
  const [clusters, setClusters] = useState<PodClusterItem[]>([])
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [images, setImages] = useState<PodClusterImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isImagesLoading, setIsImagesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCluster, setEditingCluster] = useState<PodClusterItem | null>(null)
  const [form, setForm] = useState<PodClusterFormState>(createEmptyForm())

  const fetchLocations = async () => {
    const response = await locationApi.getAll({ isActive: 'all', type: 'all' })
    setLocations(response.data)
  }

  const fetchClusters = async () => {
    try {
      setIsLoading(true)
      const response = await podClusterApi.getAll(locationFilter === 'all' ? undefined : locationFilter)
      setClusters(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load pod clusters')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchLocations(), fetchClusters()])
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load pod cluster data')
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationFilter])

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

  const totalModifiers = useMemo(
    () => clusters.reduce((sum, cluster) => sum + (cluster.base_price_modifier ?? 0), 0),
    [clusters]
  )

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
    setImages([])
    setForm({ ...createEmptyForm(), location_id: locations[0]?.id ?? '' })
    setIsModalOpen(true)
  }

  const openEditModal = async (cluster: PodClusterItem) => {
    setEditingCluster(cluster)
    setForm(toFormState(cluster))
    setIsModalOpen(true)
    setIsImagesLoading(true)

    try {
      const response = await podClusterApi.getImages(cluster.id)
      setImages(response.data)
    } catch (error: any) {
      setImages([])
      toast.error(error?.response?.data?.message || 'Failed to load cluster images')
    } finally {
      setIsImagesLoading(false)
    }
  }

  const closeModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingCluster(null)
    setImages([])
    setForm(createEmptyForm())
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
      setIsSaving(true)
      const payload = toPayload(form)

      if (editingCluster) {
        await podClusterApi.update(editingCluster.id, payload)
        toast.success('Pod cluster updated successfully')
      } else {
        await podClusterApi.create(payload)
        toast.success('Pod cluster created successfully')
      }

      closeModal()
      await fetchClusters()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save pod cluster')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCluster = async (cluster: PodClusterItem) => {
    const confirmed = window.confirm(`Delete pod cluster "${cluster.name}"?`)
    if (!confirmed) return

    try {
      await podClusterApi.delete(cluster.id)
      toast.success('Pod cluster deleted successfully')
      await fetchClusters()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete pod cluster')
    }
  }

  const handleDeleteImage = async (image: PodClusterImage) => {
    if (!editingCluster) return

    const confirmed = window.confirm('Delete this image?')
    if (!confirmed) return

    try {
      await podClusterApi.deleteImage(editingCluster.id, image.id)
      setImages((prev) => prev.filter((item) => item.id !== image.id))
      toast.success('Image deleted successfully')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete image')
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pod Cluster Management</h1>
          <p className="text-gray-500 mt-1">Manage pod cluster groups, pricing modifiers and image galleries for each location.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchClusters}
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
            Add Pod Cluster
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total Clusters</span>
            <Boxes className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{clusters.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Locations Covered</span>
            <MapPin className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{new Set(clusters.map((cluster) => cluster.location_id)).size}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total Modifier</span>
            <ImagePlus className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalModifiers.toFixed(2)}</div>
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

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Pod Clusters</h2>
          <span className="text-sm text-gray-500">{filteredClusters.length} item(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cluster</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Modifier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading pod clusters...</td>
                </tr>
              ) : filteredClusters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No pod clusters found</td>
                </tr>
              ) : (
                filteredClusters.map((cluster) => (
                  <tr key={cluster.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold text-gray-900">{cluster.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{cluster.id}</div>
                      {cluster.description && (
                        <p className="text-xs text-gray-500 mt-2 max-w-md">{cluster.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">{locationMap.get(cluster.location_id)?.name ?? cluster.location_id}</td>
                    <td className="px-6 py-4 align-top text-gray-700 font-medium">{formatMoneyModifier(cluster.base_price_modifier)}</td>
                    <td className="px-6 py-4 align-top text-gray-600">{cluster.updatedAt ? new Date(cluster.updatedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(cluster)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCluster(cluster)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
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

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCluster ? 'Edit Pod Cluster' : 'Add Pod Cluster'}
        size="xl"
        footer={(
          <>
            <button
              onClick={closeModal}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="pod-cluster-form"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : editingCluster ? 'Save Changes' : 'Create Pod Cluster'}
            </button>
          </>
        )}
      >
        <form id="pod-cluster-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <select
                value={form.location_id}
                onChange={(e) => updateForm('location_id', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select a location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
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
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      className="absolute top-2 right-2 px-2 py-1 rounded-md bg-white/90 text-xs text-red-600 border border-red-100"
                    >
                      Remove
                    </button>
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
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(image)}
                        className="absolute top-2 right-2 px-2 py-1 rounded-md bg-white/90 text-xs text-red-600 border border-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}