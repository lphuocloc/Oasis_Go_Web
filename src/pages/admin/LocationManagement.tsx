import React, { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Edit2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2
} from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import {
  locationApi,
  LOCATION_TYPES,
  type LocationItem,
  type LocationPayload,
  type LocationType
} from '../../api/lib/locationApi'

type StatusFilter = 'all' | 'true' | 'false'
type TypeFilter = LocationType | 'all'

interface LocationFormState {
  name: string
  type: LocationType
  lat: string
  lng: string
  parent_id: string
  description: string
  isActive: boolean
}

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  airport: 'Airport',
  terminal: 'Terminal',
  floor: 'Floor',
  mall: 'Mall',
  bus_station: 'Bus Station',
  waiting_lounge: 'Waiting Lounge'
}

const createEmptyForm = (): LocationFormState => ({
  name: '',
  type: 'airport',
  lat: '',
  lng: '',
  parent_id: '',
  description: '',
  isActive: true
})

const toFormState = (location: LocationItem): LocationFormState => ({
  name: location.name,
  type: location.type,
  lat: location.lat == null ? '' : String(location.lat),
  lng: location.lng == null ? '' : String(location.lng),
  parent_id: location.parent_id ?? '',
  description: location.description ?? '',
  isActive: location.isActive
})

const toPayload = (form: LocationFormState): LocationPayload => ({
  name: form.name.trim(),
  type: form.type,
  lat: form.lat.trim() === '' ? null : Number(form.lat),
  lng: form.lng.trim() === '' ? null : Number(form.lng),
  parent_id: form.parent_id || null,
  description: form.description.trim() || null,
  isActive: form.isActive
})

const formatType = (type: LocationType) => LOCATION_TYPE_LABELS[type] ?? type

const formatCoordinates = (lat: number | null, lng: number | null) => {
  if (lat == null || lng == null) return '—'
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export const LocationManagement = () => {
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null)
  const [form, setForm] = useState<LocationFormState>(createEmptyForm())

  const fetchLocations = async () => {
    try {
      setIsLoading(true)
      const response = await locationApi.getAll({
        type: typeFilter,
        isActive: statusFilter
      })
      setLocations(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load locations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLocations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter])

  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  )

  const filteredLocations = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return locations

    return locations.filter((location) => {
      const parentName = location.parent_id ? locationMap.get(location.parent_id)?.name ?? '' : ''
      return [location.name, location.id, formatType(location.type), parentName]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
  }, [locationMap, locations, search])

  const rootCount = useMemo(() => locations.filter((location) => !location.parent_id).length, [locations])
  const activeCount = useMemo(() => locations.filter((location) => location.isActive).length, [locations])

  const parentOptions = useMemo(() => {
    return locations.filter((location) => location.id !== editingLocation?.id)
  }, [editingLocation?.id, locations])

  const openCreateModal = () => {
    setEditingLocation(null)
    setForm(createEmptyForm())
    setIsModalOpen(true)
  }

  const openEditModal = (location: LocationItem) => {
    setEditingLocation(location)
    setForm(toFormState(location))
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingLocation(null)
    setForm(createEmptyForm())
  }

  const updateForm = <K extends keyof LocationFormState>(key: K, value: LocationFormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error('Location name is required')
      return false
    }

    if (form.lat.trim() !== '') {
      const lat = Number(form.lat)
      if (Number.isNaN(lat) || lat < -90 || lat > 90) {
        toast.error('Latitude must be between -90 and 90')
        return false
      }
    }

    if (form.lng.trim() !== '') {
      const lng = Number(form.lng)
      if (Number.isNaN(lng) || lng < -180 || lng > 180) {
        toast.error('Longitude must be between -180 and 180')
        return false
      }
    }

    if (editingLocation && form.parent_id === editingLocation.id) {
      toast.error('A location cannot be its own parent')
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

      if (editingLocation) {
        await locationApi.update(editingLocation.id, payload)
        toast.success('Location updated successfully')
      } else {
        await locationApi.create(payload)
        toast.success('Location created successfully')
      }

      closeModal()
      await fetchLocations()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save location')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (location: LocationItem) => {
    const confirmed = window.confirm(`Delete location "${location.name}"?`)
    if (!confirmed) return

    try {
      await locationApi.delete(location.id)
      toast.success('Location deleted successfully')
      await fetchLocations()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete location')
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Location Management</h1>
          <p className="text-gray-500 mt-1">Create and manage the hierarchy of airports, terminals, floors and service zones.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLocations}
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
            Add Location
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total Locations</span>
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{locations.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Root Locations</span>
            <MapPin className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{rootCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Active Locations</span>
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{activeCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr_0.8fr] gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, id or parent..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All types</option>
            {LOCATION_TYPES.map((type) => (
              <option key={type} value={type}>{formatType(type)}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All statuses</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Locations</h2>
          <span className="text-sm text-gray-500">{filteredLocations.length} item(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordinates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading locations...</td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No locations found</td>
                </tr>
              ) : (
                filteredLocations.map((location) => {
                  const parent = location.parent_id ? locationMap.get(location.parent_id) : null

                  return (
                    <tr key={location.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <div className="font-semibold text-gray-900">{location.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{location.id}</div>
                        {location.description && (
                          <p className="text-xs text-gray-500 mt-2 max-w-sm line-clamp-2">{location.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                          {formatType(location.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-gray-600">{parent?.name ?? 'Root'}</td>
                      <td className="px-6 py-4 align-top text-gray-600">{formatCoordinates(location.lat, location.lng)}</td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${location.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {location.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-gray-600">
                        {location.updatedAt ? new Date(location.updatedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(location)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(location)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
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

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingLocation ? 'Edit Location' : 'Add Location'}
        size="lg"
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
              form="location-form"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : editingLocation ? 'Save Changes' : 'Create Location'}
            </button>
          </>
        )}
      >
        <form id="location-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="Enter location name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value as LocationType)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {LOCATION_TYPES.map((type) => (
                  <option key={type} value={type}>{formatType(type)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => updateForm('lat', e.target.value)}
                placeholder="10.8185"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => updateForm('lng', e.target.value)}
                placeholder="106.6588"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Parent Location</label>
            <select
              value={form.parent_id}
              onChange={(e) => updateForm('parent_id', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">No parent (root location)</option>
              {parentOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({formatType(location.type)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              rows={4}
              placeholder="Optional description for this location"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => updateForm('isActive', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Active location
          </label>
        </form>
      </Modal>
    </div>
  )
}