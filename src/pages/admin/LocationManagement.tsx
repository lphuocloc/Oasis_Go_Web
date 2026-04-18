import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ArrowRight,
  Building,
  Plus,
  MapPin,
  Edit2
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table'
import {
  locationApi,
  LOCATION_TYPES,
  type LocationItem,
  type LocationPodOccupancyRate,
  type LocationPayload,
  type LocationType
} from '../../api/lib/locationApi'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  clearLocationsError,
  selectLocations,
  selectLocationsError,
  selectLocationsLoading
} from '../../store/slices/locationsSlice'
import { fetchLocations, updateLocation } from '../../store/thunks/locationsThunks'

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

const ALLOWED_CHILD_TYPE_BY_PARENT: Record<LocationType, LocationType | null> = {
  airport: 'terminal',
  terminal: null,
  floor: null,
  mall: 'floor',
  bus_station: 'waiting_lounge',
  waiting_lounge: null
}

const ROOT_PARENT_VALUE = '__ROOT__'

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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    const message = response?.data?.message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

const TableRowSkeleton = ({ columns = 6 }: { columns?: number }) => (
  <TableRow className="animate-pulse">
    {Array.from({ length: columns }).map((_, index) => (
      <TableCell key={index} className="px-6 py-4">
        <div className="h-4 w-full max-w-[12rem] rounded bg-slate-200" />
      </TableCell>
    ))}
  </TableRow>
)

export const LocationManagement = () => {
  const dispatch = useAppDispatch()
  const locations = useAppSelector(selectLocations)
  const isLoading = useAppSelector(selectLocationsLoading)
  const locationsError = useAppSelector(selectLocationsError)
  const [isLoadingChildren, setIsLoadingChildren] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null)
  const [childLocations, setChildLocations] = useState<LocationItem[]>([])
  const [occupancyRateByLocation, setOccupancyRateByLocation] = useState<Record<string, LocationPodOccupancyRate>>({})
  const [form, setForm] = useState<LocationFormState>(createEmptyForm())
  const [showMainSkeleton, setShowMainSkeleton] = useState(false)
  const [showChildSkeleton, setShowChildSkeleton] = useState(false)
  const mainLoadingStartedAtRef = useRef<number | null>(null)
  const childLoadingStartedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (isLoading) {
      mainLoadingStartedAtRef.current = Date.now()
      setShowMainSkeleton(true)
      return
    }

    if (!showMainSkeleton || mainLoadingStartedAtRef.current == null) return

    const elapsed = Date.now() - mainLoadingStartedAtRef.current
    const remaining = Math.max(0, 500 - elapsed)
    const timer = window.setTimeout(() => {
      setShowMainSkeleton(false)
      mainLoadingStartedAtRef.current = null
    }, remaining)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isLoading, showMainSkeleton])

  useEffect(() => {
    if (isLoadingChildren) {
      childLoadingStartedAtRef.current = Date.now()
      setShowChildSkeleton(true)
      return
    }

    if (!showChildSkeleton || childLoadingStartedAtRef.current == null) return

    const elapsed = Date.now() - childLoadingStartedAtRef.current
    const remaining = Math.max(0, 500 - elapsed)
    const timer = window.setTimeout(() => {
      setShowChildSkeleton(false)
      childLoadingStartedAtRef.current = null
    }, remaining)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isLoadingChildren, showChildSkeleton])

  useEffect(() => {
    dispatch(fetchLocations())
  }, [dispatch])

  useEffect(() => {
    if (!locationsError) return

    toast.error(locationsError)
    dispatch(clearLocationsError())
  }, [dispatch, locationsError])

  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  )

  const parentOptions = useMemo(() => {
    return locations.filter((location) => {
      if (location.id === editingLocation?.id) return false
      if (location.lat == null || location.lng == null) return false
      return Number.isFinite(location.lat) && Number.isFinite(location.lng)
    })
  }, [editingLocation?.id, locations])

  const selectedParent = useMemo(() => {
    if (!form.parent_id) return null
    return locationMap.get(form.parent_id) ?? null
  }, [form.parent_id, locationMap])

  const enforcedChildType = useMemo(() => {
    if (!selectedParent) return null
    return ALLOWED_CHILD_TYPE_BY_PARENT[selectedParent.type]
  }, [selectedParent])

  const availableTypeOptions = useMemo(() => {
    if (!selectedParent) return LOCATION_TYPES
    if (!enforcedChildType) return []
    return LOCATION_TYPES.filter((type) => type === enforcedChildType)
  }, [enforcedChildType, selectedParent])

  const visibleLocations = useMemo(() => {
    return locations.filter((location) => {
      if (location.lat == null || location.lng == null) return false
      return Number.isFinite(location.lat) && Number.isFinite(location.lng)
    })
  }, [locations])

  const childCountByParentId = useMemo(() => {
    return locations.reduce<Record<string, number>>((acc, location) => {
      if (!location.parent_id) return acc

      acc[location.parent_id] = (acc[location.parent_id] ?? 0) + 1
      return acc
    }, {})
  }, [locations])

  useEffect(() => {
    if (!selectedLocation) return

    const latestSelectedLocation = locationMap.get(selectedLocation.id)

    if (!latestSelectedLocation) {
      setSelectedLocation(null)
      setChildLocations([])
      return
    }

    if (latestSelectedLocation !== selectedLocation) {
      setSelectedLocation(latestSelectedLocation)
    }

    setChildLocations((prev) => prev.map((child) => locationMap.get(child.id) ?? child))
  }, [locationMap, selectedLocation])

  useEffect(() => {
    const missingIds = visibleLocations
      .map((location) => location.id)
      .filter((id) => !occupancyRateByLocation[id])

    if (missingIds.length === 0) return

    let isCancelled = false

    const loadOccupancyRates = async () => {
      const results = await Promise.allSettled(
        missingIds.map(async (id) => {
          const response = await locationApi.getPodOccupancyRate(id)
          return { id, data: response.data }
        })
      )

      if (isCancelled) return

      const updates: Record<string, LocationPodOccupancyRate> = {}

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          updates[result.value.id] = result.value.data
        }
      })

      if (Object.keys(updates).length > 0) {
        setOccupancyRateByLocation((prev) => ({
          ...prev,
          ...updates
        }))
      }
    }

    void loadOccupancyRates()

    return () => {
      isCancelled = true
    }
  }, [occupancyRateByLocation, visibleLocations])

  const activeChildrenCount = useMemo(
    () => childLocations.filter((location) => location.isActive).length,
    [childLocations]
  )

  const inactiveChildrenCount = childLocations.length - activeChildrenCount

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

  const handleSelectLocation = async (location: LocationItem) => {
    try {
      setSelectedLocation(location)
      setIsLoadingChildren(true)
      const [childrenResponse, occupancyResponse] = await Promise.all([
        locationApi.getAll({ parent_id: location.id }),
        locationApi.getPodOccupancyRate(location.id)
      ])
      setOccupancyRateByLocation((prev) => ({
        ...prev,
        [location.id]: occupancyResponse.data
      }))
      setChildLocations(childrenResponse.data)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể tải danh sách vị trí con'))
      setChildLocations([])
    } finally {
      setIsLoadingChildren(false)
    }
  }

  const handleBackToList = () => {
    setSelectedLocation(null)
    setChildLocations([])
  }

  const updateForm = <K extends keyof LocationFormState>(key: K, value: LocationFormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleParentChange = (value: string) => {
    const parentId = value === ROOT_PARENT_VALUE ? '' : value
    const nextParent = parentId ? locationMap.get(parentId) ?? null : null
    const allowedChildType = nextParent
      ? ALLOWED_CHILD_TYPE_BY_PARENT[nextParent.type]
      : null

    setForm((prev) => {
      if (!nextParent || !allowedChildType) {
        return {
          ...prev,
          parent_id: parentId
        }
      }

      return {
        ...prev,
        parent_id: parentId,
        type: allowedChildType
      }
    })
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

    if (!editingLocation && form.parent_id) {
      const parent = locationMap.get(form.parent_id)

      if (!parent) {
        toast.error('Parent location not found')
        return false
      }

      const allowedChildType = ALLOWED_CHILD_TYPE_BY_PARENT[parent.type]

      if (!allowedChildType) {
        toast.error(`${formatType(parent.type)} không được có vị trí con`)
        return false
      }

      if (form.type !== allowedChildType) {
        toast.error(
          `${formatType(parent.type)} chỉ được có vị trí con loại ${formatType(allowedChildType)}`
        )
        return false
      }
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
        await dispatch(updateLocation({ id: editingLocation.id, payload })).unwrap()
        toast.success('Location updated successfully')
      } else {
        await locationApi.create(payload)
        toast.success('Location created successfully')
        await dispatch(fetchLocations())
      }

      closeModal()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save location'))
    } finally {
      setIsSaving(false)
    }
  }

  const getOccupancyMetrics = (location: LocationItem) => {
    const occupancyData = occupancyRateByLocation[location.id]
    if (!occupancyData) return null

    const rateFromPrimary = occupancyData.primaryRate?.type === 'ACTIVE_RATE'
      ? occupancyData.primaryRate.value
      : null

    const activeRate = rateFromPrimary ?? occupancyData.activeRate

    return {
      activeRate: Math.round(activeRate),
      activePods: occupancyData.activePods,
      totalPods: occupancyData.totalPods
    }
  }

  return (
    <div className="space-y-6">
      {selectedLocation ? (
        <>
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Quay lại danh sách vị trí
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                  <Building size={28} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold text-slate-900">{selectedLocation.name}</h2>
                  <p className="flex items-center gap-2 text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {selectedLocation.description?.trim() || 'Chưa có mô tả địa chỉ'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                      {formatType(selectedLocation.type)}
                    </span>
                    <span className="text-slate-600">
                      Tọa độ: <span className="font-semibold text-slate-900">{formatCoordinates(selectedLocation.lat, selectedLocation.lng)}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center">
                  <p className="text-3xl font-bold text-indigo-600">{childLocations.length}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vị trí con</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{activeChildrenCount}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Đang hoạt động</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center">
                  <p className="text-3xl font-bold text-rose-600">{inactiveChildrenCount}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dừng hoạt động</p>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Ghi chú:</span>{' '}
              {selectedLocation.description?.trim() || 'Chưa có ghi chú cho vị trí này.'}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-slate-900">Danh sách vị trí con</h3>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Table className="w-full text-left text-sm">
                <TableHeader className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-semibold">Tên vị trí con</TableHead>
                    <TableHead className="px-6 py-4 font-semibold">Loại</TableHead>
                    <TableHead className="px-6 py-4 font-semibold">Trạng thái</TableHead>
                    <TableHead className="px-6 py-4 text-right font-semibold">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {showChildSkeleton ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRowSkeleton key={`child-skeleton-${index}`} columns={4} />
                    ))
                  ) : childLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Chưa có vị trí con nào thuộc vị trí này.
                      </TableCell>
                    </TableRow>
                  ) : (
                    childLocations.map((child) => (
                      <TableRow key={child.id} className="hover:bg-slate-50">
                        <TableCell className="px-6 py-4 font-semibold text-slate-900">{child.name}</TableCell>
                        <TableCell className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {formatType(child.type)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${child.isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${child.isActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {child.isActive ? 'Đang hoạt động' : 'Dừng hoạt động'}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditModal(child)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Edit2 className="h-4 w-4" />
                            Chỉnh sửa
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Quản Lý Vị Trí</h1>
              <p className="text-slate-500">Chọn một vị trí để xem các vị trí con.</p>
            </div>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
              Thêm vị trí
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-sm">
                <TableHeader className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-semibold">Tên vị trí</TableHead>
                    <TableHead className="px-6 py-4 font-semibold">Loại</TableHead>
                    <TableHead className="px-6 py-4 font-semibold">Địa chỉ / Chi tiết</TableHead>
                    <TableHead className="px-6 py-4 font-semibold">Tỷ lệ hoạt động</TableHead>
                    <TableHead className="px-6 py-4 font-semibold">Trạng thái</TableHead>
                    <TableHead className="px-6 py-4 text-right font-semibold">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {showMainSkeleton ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <TableRowSkeleton key={`location-skeleton-${index}`} columns={6} />
                    ))
                  ) : visibleLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="px-6 py-12 text-center text-slate-400">Không có vị trí nào có tọa độ.</TableCell>
                    </TableRow>
                  ) : (
                    visibleLocations.map((location) => {
                      const parent = location.parent_id ? locationMap.get(location.parent_id) : null
                      const childCount = childCountByParentId[location.id] ?? 0
                      const details = location.description?.trim() ||
                        [
                          parent ? `Cha: ${parent.name}` : null,
                          formatCoordinates(location.lat, location.lng) !== '—' ? formatCoordinates(location.lat, location.lng) : null
                        ]
                          .filter(Boolean)
                          .join(' - ') || 'Chưa có chi tiết'
                      const occupancyMetrics = getOccupancyMetrics(location)

                      return (
                        <TableRow
                          key={location.id}
                          onClick={() => handleSelectLocation(location)}
                          className="group cursor-pointer transition-colors hover:bg-slate-50"
                        >
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                <Building size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{location.name}</p>
                                <p className="text-xs text-slate-500">{childCount} vị trí con</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                              {formatType(location.type)}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[30rem] truncate px-6 py-4 text-slate-500">{details}</TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="w-36">
                              {occupancyMetrics ? (
                                <>
                                  <div className="mb-1 flex items-center justify-between text-xs">
                                    <span className="font-medium text-slate-700">{occupancyMetrics.activeRate}%</span>
                                    <span className="text-slate-500">{occupancyMetrics.activePods}/{occupancyMetrics.totalPods}</span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                                    <div
                                      className={`h-1.5 rounded-full ${occupancyMetrics.activeRate > 80 ? 'bg-indigo-600' : 'bg-emerald-500'}`}
                                      style={{ width: `${occupancyMetrics.activeRate}%` }}
                                    />
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400">Đang cập nhật...</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${location.isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${location.isActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              {location.isActive ? 'Đang hoạt động' : 'Dừng hoạt động'}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <button
                              onClick={(event) => {
                                event.stopPropagation()
                                handleSelectLocation(location)
                              }}
                              className="text-slate-400 transition-colors group-hover:text-indigo-600"
                              aria-label={`Xem ${location.name}`}
                            >
                              <ArrowRight size={20} />
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin className="h-4 w-4" />
            Bấm vào một dòng để xem các vị trí con.
          </div>
        </>
      )}

      <Dialog
        open={isModalOpen}
        onOpenChange={(open: boolean) => {
          if (!open) closeModal()
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Chỉnh sửa vị trí' : 'Thêm vị trí'}</DialogTitle>
            <DialogDescription className="sr-only">
              Form để {editingLocation ? 'chỉnh sửa' : 'thêm'} vị trí.
            </DialogDescription>
          </DialogHeader>

          <form id="location-form" onSubmit={handleSubmit} className="space-y-5 px-6 pb-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Tên vị trí</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="Nhập tên vị trí"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Loại</label>
                <Select
                  value={form.type}
                  onValueChange={(value) => updateForm('type', value as LocationType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại vị trí" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>{formatType(type)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedParent && !enforcedChildType && (
                  <p className="mt-1 text-xs text-amber-600">
                    Loại vị trí cha này không được phép tạo vị trí con.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Vĩ độ (Latitude)</label>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => updateForm('lat', e.target.value)}
                  placeholder="Ví dụ: 10.8185"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Kinh độ (Longitude)</label>
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => updateForm('lng', e.target.value)}
                  placeholder="Ví dụ: 106.6588"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Vị trí cha</label>
              <Select
                value={form.parent_id || ROOT_PARENT_VALUE}
                onValueChange={handleParentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vị trí cha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT_PARENT_VALUE}>Không có vị trí cha (gốc)</SelectItem>
                  {parentOptions.map((location) => (
                    <SelectItem
                      key={location.id}
                      value={location.id}
                      disabled={!ALLOWED_CHILD_TYPE_BY_PARENT[location.type]}
                    >
                      {location.name} ({formatType(location.type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Mô tả</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={4}
                placeholder="Mô tả thêm cho vị trí này (không bắt buộc)"
                className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => updateForm('isActive', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Vị trí đang hoạt động
            </label>
          </form>

          <DialogFooter>
            <button
              onClick={closeModal}
              disabled={isSaving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="location-form"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? 'Đang lưu...' : editingLocation ? 'Lưu thay đổi' : 'Tạo vị trí'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}