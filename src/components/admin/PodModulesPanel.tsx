import React, { useEffect, useState } from 'react'
import { DoorClosed, DoorOpen, Lock, LockOpen, RefreshCw, Trash2, X } from 'lucide-react'
import { toast } from 'react-toastify'
import { type PodItem } from '../../api/lib/admin/podApi'
import { podAmenityApi, type PodAmenityItem } from '../../api/lib/admin/podAmenityApi'
import { doorApi, type DoorItem } from '../../api/lib/admin/doorApi'
import { podDeviceApi, type PodDeviceItem } from '../../api/lib/admin/podDeviceApi'
import { podQrCodeApi, type PodQrCodeItem } from '../../api/lib/admin/podQrCodeApi'
import { timeSlotApi, type TimeSlotItem, type TimeSlotStatus } from '../../api/lib/admin/timeSlotApi'
import { podItemApi, type PodItemLink } from '../../api/lib/admin/podItemApi'
import { itemApi, type CreateItemPayload, type InventoryItem, type ItemType } from '../../api/lib/admin/itemApi'

type ModuleTab = 'amenities' | 'door' | 'devices' | 'qrcodes' | 'timeslots' | 'poditems'

interface PodModulesPanelProps {
  pod: PodItem | null
  onClose: () => void
}

const MODULE_TABS: Array<{ key: ModuleTab; label: string }> = [
  { key: 'amenities', label: 'Amenities' },
  { key: 'door', label: 'Door' },
  { key: 'devices', label: 'Device' },
  { key: 'qrcodes', label: 'QR Codes' },
  { key: 'timeslots', label: 'Time Slots' },
  { key: 'poditems', label: 'Pod Items' }
]

export const PodModulesPanel: React.FC<PodModulesPanelProps> = ({ pod, onClose }) => {
  const [activeTab, setActiveTab] = useState<ModuleTab>('amenities')
  const [isLoading, setIsLoading] = useState(false)

  const [amenities, setAmenities] = useState<PodAmenityItem[]>([])
  const [amenityName, setAmenityName] = useState('')
  const [amenityValue, setAmenityValue] = useState('')

  const [doors, setDoors] = useState<DoorItem[]>([])
  const [doorLockStatus, setDoorLockStatus] = useState<'LOCKED' | 'UNLOCKED'>('LOCKED')
  const [doorSensorStatus, setDoorSensorStatus] = useState<'CLOSED' | 'OPEN'>('CLOSED')

  const [devices, setDevices] = useState<PodDeviceItem[]>([])
  const [deviceName, setDeviceName] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [deviceToken, setDeviceToken] = useState('')

  const [qrCodes, setQrCodes] = useState<PodQrCodeItem[]>([])
  const [qrExpiresAt, setQrExpiresAt] = useState('')
  const [qrToken, setQrToken] = useState('')
  const [qrActive, setQrActive] = useState(true)

  const [timeSlots, setTimeSlots] = useState<TimeSlotItem[]>([])
  const [slotStartAt, setSlotStartAt] = useState('')
  const [slotEndAt, setSlotEndAt] = useState('')
  const [slotStatus, setSlotStatus] = useState<TimeSlotStatus>('AVAILABLE')
  const [slotStartDate, setSlotStartDate] = useState('')
  const [slotEndDate, setSlotEndDate] = useState('')
  const [generateDays, setGenerateDays] = useState('7')
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])
  const [clusterAvailDate, setClusterAvailDate] = useState('')
  const [clusterAvailableSlots, setClusterAvailableSlots] = useState<TimeSlotItem[]>([])

  const [podItems, setPodItems] = useState<PodItemLink[]>([])
  const [itemId, setItemId] = useState('')
  const [expectedQty, setExpectedQty] = useState('1')
  const [currentQty, setCurrentQty] = useState('1')
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [itemsLoadError, setItemsLoadError] = useState<string | null>(null)
  const [isCreatingItem, setIsCreatingItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState<ItemType>('CONSUMABLE')
  const [newItemUnitCost, setNewItemUnitCost] = useState('0')

  const hasSelectedPod = !!pod

  const resetLightForms = () => {
    setAmenityName('')
    setAmenityValue('')
    setDeviceName('')
    setDeviceId('')
    setDeviceToken('')
    setQrExpiresAt('')
    setQrToken('')
    setQrActive(true)
    setSlotStartAt('')
    setSlotEndAt('')
    setSlotStatus('AVAILABLE')
    setSelectedSlotIds([])
    setItemId('')
    setExpectedQty('1')
    setCurrentQty('1')
    setNewItemName('')
    setNewItemType('CONSUMABLE')
    setNewItemUnitCost('0')
  }

  const loadModuleData = async () => {
    if (!pod) return

    try {
      setIsLoading(true)
      const [amenityRes, doorRes, deviceRes, qrRes, slotRes, podItemRes] = await Promise.all([
        podAmenityApi.getAll({ pod_id: pod.id }),
        doorApi.getAll({ pod_id: pod.id }),
        podDeviceApi.getAll({ pod_id: pod.id }),
        podQrCodeApi.getAll({ pod_id: pod.id }),
        timeSlotApi.getAll({ pod_id: pod.id, start_date: slotStartDate || undefined, end_date: slotEndDate || undefined }),
        podItemApi.getAll({ pod_id: pod.id })
      ])

      setAmenities(amenityRes.data)
      setDoors(doorRes.data)
      setDevices(deviceRes.data)
      setQrCodes(qrRes.data)
      setTimeSlots(slotRes.data)
      setPodItems(podItemRes.data)
      setSelectedSlotIds([])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load pod modules')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    resetLightForms()
    setClusterAvailableSlots([])
    if (!pod) return
    loadModuleData()
    loadAvailableItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod?.id])

  const reloadSlots = async () => {
    if (!pod) return
    try {
      const response = await timeSlotApi.getAll({
        pod_id: pod.id,
        start_date: slotStartDate || undefined,
        end_date: slotEndDate || undefined
      })
      setTimeSlots(response.data)
      setSelectedSlotIds([])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load time slots')
    }
  }

  const toggleSlotSelection = (id: string) => {
    setSelectedSlotIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const parseNonNegativeInt = (value: string): number | null => {
    const num = Number(value)
    if (!Number.isFinite(num)) return null
    const intVal = Math.floor(num)
    return intVal >= 0 ? intVal : null
  }

  const getItemUnitCost = (item: InventoryItem): number | null => {
    const candidate = item.unit_cost ?? item.unitCost
    if (candidate == null) return null
    const num = Number(candidate)
    return Number.isFinite(num) ? num : null
  }

  const loadAvailableItems = async () => {
    try {
      setIsLoadingItems(true)
      const response = await itemApi.getAll()
      setAvailableItems(response.data || [])
      setItemsLoadError(null)
    } catch (error: any) {
      setAvailableItems([])
      if (error?.response?.status === 404) {
        setItemsLoadError('Backend has no Item routes yet (GET /items or GET /item). You can still paste Item ID manually.')
      } else {
        setItemsLoadError(error?.response?.data?.message || 'Could not load items list. You can still paste Item ID manually.')
      }
    } finally {
      setIsLoadingItems(false)
    }
  }

  const handleCreateItem = async () => {
    const trimmedName = newItemName.trim()
    if (!trimmedName) {
      toast.error('Item name is required')
      return
    }

    const unitCost = Number(newItemUnitCost)
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      toast.error('Unit cost must be a number >= 0')
      return
    }

    const payload: CreateItemPayload = {
      name: trimmedName,
      item_type: newItemType,
      unit_cost: unitCost
    }

    try {
      setIsCreatingItem(true)
      const response = await itemApi.create(payload)
      const createdItem = response.data
      await loadAvailableItems()
      if (createdItem?.id) {
        setItemId(createdItem.id)
      }
      setNewItemName('')
      setNewItemType('CONSUMABLE')
      setNewItemUnitCost('0')
      toast.success('Item created. You can now add it to this pod.')
    } catch (error: any) {
      const status = error?.response?.status
      const message = error?.response?.data?.message
      if (status === 404) {
        toast.error('Item API route is missing on backend (POST /items or POST /item).')
      } else if (status === 409) {
        toast.error(message || 'Item already exists')
      } else if (status === 400) {
        toast.error(message || 'Invalid item data')
      } else {
        toast.error(message || 'Failed to create item')
      }
    } finally {
      setIsCreatingItem(false)
    }
  }

  if (!hasSelectedPod) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Pod Modules: {pod.code} - {pod.name}</h2>
            <p className="text-xs text-gray-500 mt-1">Pod ID: {pod.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadModuleData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 px-6 pt-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 pb-4">
            {MODULE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'amenities' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Pod Amenities</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={amenityName} onChange={(e) => setAmenityName(e.target.value)} placeholder="Amenity name" className="px-3 py-2 border border-gray-200 rounded-lg" />
              <input value={amenityValue} onChange={(e) => setAmenityValue(e.target.value)} placeholder="Value (optional)" className="px-3 py-2 border border-gray-200 rounded-lg" />
              <button
                onClick={async () => {
                  if (!pod || !amenityName.trim()) {
                    toast.error('Amenity name is required')
                    return
                  }
                  try {
                    await podAmenityApi.create({ pod_id: pod.id, name: amenityName.trim(), value: amenityValue.trim() || undefined })
                    setAmenityName('')
                    setAmenityValue('')
                    await loadModuleData()
                    toast.success('Amenity added')
                  } catch (error: any) {
                    toast.error(error?.response?.data?.message || 'Failed to add amenity')
                  }
                }}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Add Amenity
              </button>
            </div>

            <div className="space-y-2">
              {amenities.length === 0 ? <p className="text-sm text-gray-400">No amenities yet</p> : amenities.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.value || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const name = window.prompt('Amenity name', item.name)
                        if (!name) return
                        const value = window.prompt('Amenity value', item.value || '')
                        try {
                          await podAmenityApi.update(item.id, { name: name.trim(), value: value ?? '' })
                          await loadModuleData()
                          toast.success('Amenity updated')
                        } catch (error: any) {
                          toast.error(error?.response?.data?.message || 'Failed to update amenity')
                        }
                      }}
                      className="px-2.5 py-1.5 rounded border border-gray-200 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Delete this amenity?')) return
                        try {
                          await podAmenityApi.delete(item.id)
                          await loadModuleData()
                          toast.success('Amenity deleted')
                        } catch (error: any) {
                          toast.error(error?.response?.data?.message || 'Failed to delete amenity')
                        }
                      }}
                      className="px-2.5 py-1.5 rounded border border-red-200 text-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'door' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-800">Door Control</h3>

            {/* Current status card */}
            {doors.length > 0 ? doors.map((door) => (
              <div key={door.id} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Door Status</span>
                  <span className="text-xs text-gray-400">Last sync: {door.last_sync_at ? new Date(door.last_sync_at).toLocaleString() : '—'}</span>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                  {/* Lock status */}
                  <div className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                    door.lock_status === 'LOCKED'
                      ? 'border-red-300 bg-red-50'
                      : 'border-green-300 bg-green-50'
                  }`}>
                    {door.lock_status === 'LOCKED'
                      ? <Lock className="w-10 h-10 text-red-500" />
                      : <LockOpen className="w-10 h-10 text-green-500" />
                    }
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Lock</p>
                      <span className={`text-sm font-bold ${
                        door.lock_status === 'LOCKED' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {door.lock_status}
                      </span>
                    </div>
                  </div>

                  {/* Sensor status */}
                  <div className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                    door.door_sensor === 'OPEN'
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-blue-300 bg-blue-50'
                  }`}>
                    {door.door_sensor === 'OPEN'
                      ? <DoorOpen className="w-10 h-10 text-amber-500" />
                      : <DoorClosed className="w-10 h-10 text-blue-500" />
                    }
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Door Sensor</p>
                      <span className={`text-sm font-bold ${
                        door.door_sensor === 'OPEN' ? 'text-amber-600' : 'text-blue-600'
                      }`}>
                        {door.door_sensor}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
                  <button
                    onClick={async () => {
                      if (!window.confirm('Delete this door record?')) return
                      try {
                        await doorApi.delete(door.id)
                        await loadModuleData()
                        toast.success('Door deleted')
                      } catch (error: any) {
                        toast.error(error?.response?.data?.message || 'Failed to delete door')
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <DoorClosed className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No door record for this pod.</p>
              </div>
            )}

            {/* Edit / Create form */}
            <div className="rounded-xl border border-gray-200 p-5">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">
                {doors.length > 0 ? 'Update Door Status' : 'Create Door Record'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Lock toggle */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-gray-600">Lock Status</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDoorLockStatus('LOCKED')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                        doorLockStatus === 'LOCKED'
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      LOCKED
                    </button>
                    <button
                      onClick={() => setDoorLockStatus('UNLOCKED')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                        doorLockStatus === 'UNLOCKED'
                          ? 'border-green-400 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <LockOpen className="w-4 h-4" />
                      UNLOCKED
                    </button>
                  </div>
                </div>

                {/* Sensor toggle */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-gray-600">Door Sensor</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDoorSensorStatus('CLOSED')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                        doorSensorStatus === 'CLOSED'
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <DoorClosed className="w-4 h-4" />
                      CLOSED
                    </button>
                    <button
                      onClick={() => setDoorSensorStatus('OPEN')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                        doorSensorStatus === 'OPEN'
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <DoorOpen className="w-4 h-4" />
                      OPEN
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!pod) return
                  try {
                    if (doors.length > 0) {
                      await doorApi.update(doors[0].id, { lock_status: doorLockStatus, door_sensor: doorSensorStatus, last_sync_at: new Date().toISOString() })
                      toast.success('Door updated')
                    } else {
                      await doorApi.create({ pod_id: pod.id, lock_status: doorLockStatus, door_sensor: doorSensorStatus })
                      toast.success('Door created')
                    }
                    await loadModuleData()
                  } catch (error: any) {
                    toast.error(error?.response?.data?.message || 'Failed to save door')
                  }
                }}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {doors.length > 0 ? 'Save Changes' : 'Create Door'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Pod Devices</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Device name" className="px-3 py-2 border border-gray-200 rounded-lg" />
              <input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="Device ID" className="px-3 py-2 border border-gray-200 rounded-lg" />
              <input value={deviceToken} onChange={(e) => setDeviceToken(e.target.value)} placeholder="Auth token (optional)" className="px-3 py-2 border border-gray-200 rounded-lg" />
              <button
                onClick={async () => {
                  if (!pod || !deviceName.trim() || !deviceId.trim()) {
                    toast.error('Device name and device ID are required')
                    return
                  }
                  try {
                    await podDeviceApi.create({
                      pod_id: pod.id,
                      device_name: deviceName.trim(),
                      device_id: deviceId.trim(),
                      auth_token: deviceToken.trim() || undefined,
                      is_online: false
                    })
                    setDeviceName('')
                    setDeviceId('')
                    setDeviceToken('')
                    await loadModuleData()
                    toast.success('Device created')
                  } catch (error: any) {
                    toast.error(error?.response?.data?.message || 'Failed to create device')
                  }
                }}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Add Device
              </button>
            </div>

            <div className="space-y-2">
              {devices.length === 0 ? <p className="text-sm text-gray-400">No devices yet</p> : devices.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.device_name} ({item.device_id})</p>
                    <p className="text-xs text-gray-500">Online: {item.is_online ? 'Yes' : 'No'} | Last ping: {item.last_ping ? new Date(item.last_ping).toLocaleString() : '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const name = window.prompt('Device name', item.device_name)
                        if (!name) return
                        const nextId = window.prompt('Device ID', item.device_id)
                        if (!nextId) return
                        try {
                          await podDeviceApi.update(item.id, { device_name: name, device_id: nextId })
                          await loadModuleData()
                          toast.success('Device updated')
                        } catch (error: any) {
                          toast.error(error?.response?.data?.message || 'Failed to update device')
                        }
                      }}
                      className="px-2.5 py-1.5 rounded border border-gray-200 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Delete this device?')) return
                        try {
                          await podDeviceApi.delete(item.id)
                          await loadModuleData()
                          toast.success('Device deleted')
                        } catch (error: any) {
                          toast.error(error?.response?.data?.message || 'Failed to delete device')
                        }
                      }}
                      className="px-2.5 py-1.5 rounded border border-red-200 text-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'qrcodes' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Pod QR Codes</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input type="datetime-local" value={qrExpiresAt} onChange={(e) => setQrExpiresAt(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg" />
              <input value={qrToken} onChange={(e) => setQrToken(e.target.value)} placeholder="QR token (optional)" className="px-3 py-2 border border-gray-200 rounded-lg" />
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700">
                <input type="checkbox" checked={qrActive} onChange={(e) => setQrActive(e.target.checked)} />
                Active
              </label>
              <button
                onClick={async () => {
                  if (!pod || !qrExpiresAt) {
                    toast.error('expires_at is required')
                    return
                  }
                  try {
                    await podQrCodeApi.create({
                      pod_id: pod.id,
                      expires_at: new Date(qrExpiresAt).toISOString(),
                      qr_token: qrToken.trim() || undefined,
                      is_active: qrActive
                    })
                    setQrExpiresAt('')
                    setQrToken('')
                    setQrActive(true)
                    await loadModuleData()
                    toast.success('QR code created')
                  } catch (error: any) {
                    toast.error(error?.response?.data?.message || 'Failed to create QR code')
                  }
                }}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Add QR
              </button>
            </div>

            <div className="space-y-2">
              {qrCodes.length === 0 ? <p className="text-sm text-gray-400">No QR codes yet</p> : qrCodes.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.qr_token}</p>
                    <p className="text-xs text-gray-500">Expires: {new Date(item.expires_at).toLocaleString()} | Active: {item.is_active ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const nextActive = !item.is_active
                        try {
                          await podQrCodeApi.update(item.id, { is_active: nextActive })
                          await loadModuleData()
                          toast.success('QR status updated')
                        } catch (error: any) {
                          toast.error(error?.response?.data?.message || 'Failed to update QR')
                        }
                      }}
                      className="px-2.5 py-1.5 rounded border border-gray-200 text-sm"
                    >
                      {item.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Delete this QR code?')) return
                        try {
                          await podQrCodeApi.delete(item.id)
                          await loadModuleData()
                          toast.success('QR deleted')
                        } catch (error: any) {
                          toast.error(error?.response?.data?.message || 'Failed to delete QR')
                        }
                      }}
                      className="px-2.5 py-1.5 rounded border border-red-200 text-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'timeslots' && (
          <div className="space-y-6">

            {/* Section 1: Generate slots automatically */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-1">Auto-generate Slots</h4>
              <p className="text-xs text-gray-500 mb-3">Automatically generate time slots for this pod for the next N days.</p>
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Days ahead</label>
                  <input
                    type="number"
                    min="1"
                    value={generateDays}
                    onChange={(e) => setGenerateDays(e.target.value)}
                    className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="7"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!pod) return
                    try {
                      await timeSlotApi.generateByPod(pod.id, Number(generateDays) || 7)
                      await reloadSlots()
                      toast.success('Time slots generated successfully')
                    } catch (error: any) {
                      toast.error(error?.response?.data?.message || 'Failed to generate slots')
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  Generate Slots
                </button>
              </div>
            </div>

            {/* Section 2: Add single slot manually */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-1">Add Slot Manually</h4>
              <p className="text-xs text-gray-500 mb-3">
                Each slot is exactly <span className="font-semibold text-gray-700">30 minutes</span>. If the selected range is longer, it will be split into multiple 30-min slots automatically.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Start time <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={slotStartAt}
                    onChange={(e) => setSlotStartAt(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">End time <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={slotEndAt}
                    onChange={(e) => setSlotEndAt(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Initial status</label>
                  <select
                    value={slotStatus}
                    onChange={(e) => setSlotStatus(e.target.value as TimeSlotStatus)}
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="RESERVED">RESERVED</option>
                  </select>
                </div>
              </div>

              {/* Live preview */}
              {slotStartAt && slotEndAt && (() => {
                const startMs = new Date(slotStartAt).getTime()
                const endMs = new Date(slotEndAt).getTime()
                const diffMin = (endMs - startMs) / 60000
                if (endMs <= startMs) {
                  return <p className="mt-3 text-xs text-red-500">End time must be after start time.</p>
                }
                if (diffMin % 30 !== 0) {
                  return <p className="mt-3 text-xs text-red-500">Duration ({diffMin} min) is not a multiple of 30 minutes. Please adjust the end time.</p>
                }
                const count = diffMin / 30
                return (
                  <p className="mt-3 text-xs text-blue-600 font-medium">
                    {count === 1
                      ? 'Will create 1 slot (30 min)'
                      : `Will create ${count} slots of 30 min each (total ${diffMin} min)`}
                  </p>
                )
              })()}

              <button
                onClick={async () => {
                  if (!pod || !slotStartAt || !slotEndAt) {
                    toast.error('Start time and end time are required')
                    return
                  }
                  const startMs = new Date(slotStartAt).getTime()
                  const endMs = new Date(slotEndAt).getTime()
                  const diffMin = (endMs - startMs) / 60000
                  if (endMs <= startMs) {
                    toast.error('End time must be after start time')
                    return
                  }
                  if (diffMin % 30 !== 0) {
                    toast.error(`Duration (${diffMin} min) is not a multiple of 30 minutes`)
                    return
                  }
                  const count = diffMin / 30
                  try {
                    const slotPayloads = Array.from({ length: count }, (_, i) => ({
                      pod_id: pod.id,
                      start_time: new Date(startMs + i * 30 * 60000).toISOString(),
                      end_time: new Date(startMs + (i + 1) * 30 * 60000).toISOString(),
                      status: slotStatus
                    }))
                    await Promise.all(slotPayloads.map((p) => timeSlotApi.create(p)))
                    setSlotStartAt('')
                    setSlotEndAt('')
                    await reloadSlots()
                    toast.success(count === 1 ? 'Time slot added' : `${count} time slots added`)
                  } catch (error: any) {
                    toast.error(error?.response?.data?.message || 'Failed to create time slot(s)')
                  }
                }}
                className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
              >
                Add Slot(s)
              </button>
            </div>

            {/* Section 3: List & Filter */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-1">Slot List</h4>
              <p className="text-xs text-gray-500 mb-3">Filter by date range. Select multiple slots to bulk reserve or release.</p>

              {/* Filter bar */}
              <div className="flex flex-wrap items-end gap-3 mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">From date</label>
                  <input
                    type="date"
                    value={slotStartDate}
                    onChange={(e) => setSlotStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">To date</label>
                  <input
                    type="date"
                    value={slotEndDate}
                    onChange={(e) => setSlotEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={reloadSlots}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50"
                >
                  Filter
                </button>
                {(slotStartDate || slotEndDate) && (
                  <button
                    onClick={() => { setSlotStartDate(''); setSlotEndDate(''); }}
                    className="px-3 py-2 rounded-lg text-gray-400 text-sm hover:text-gray-600"
                  >
                    Clear filter
                  </button>
                )}
              </div>

              {/* Bulk actions */}
              {selectedSlotIds.length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-700 font-medium">{selectedSlotIds.length} slot(s) selected</span>
                  <button
                    onClick={async () => {
                      try {
                        await timeSlotApi.reserve(selectedSlotIds)
                        await reloadSlots()
                        toast.success('Selected slots reserved')
                      } catch (error: any) {
                        toast.error(error?.response?.data?.message || 'Failed to reserve slots')
                      }
                    }}
                    className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                  >
                    Reserve
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await timeSlotApi.release(selectedSlotIds)
                        await reloadSlots()
                        toast.success('Selected slots released')
                      } catch (error: any) {
                        toast.error(error?.response?.data?.message || 'Failed to release slots')
                      }
                    }}
                    className="px-3 py-1 rounded bg-gray-600 text-white text-xs hover:bg-gray-700"
                  >
                    Release
                  </button>
                  <button
                    onClick={() => setSelectedSlotIds([])}
                    className="px-3 py-1 rounded border border-gray-200 text-gray-600 text-xs hover:bg-gray-50"
                  >
                    Deselect all
                  </button>
                </div>
              )}

              {/* Slots table */}
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left w-8">
                        <input
                          type="checkbox"
                          checked={timeSlots.length > 0 && selectedSlotIds.length === timeSlots.length}
                          onChange={(e) => setSelectedSlotIds(e.target.checked ? timeSlots.map(s => s.id) : [])}
                          className="rounded"
                        />
                      </th>
                      <th className="px-3 py-2 text-left">Start</th>
                      <th className="px-3 py-2 text-left">End</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400 text-sm">No time slots yet. Use Generate Slots or Add Slot above.</td></tr>
                    ) : timeSlots.map((slot) => (
                      <tr key={slot.id} className={`border-t border-gray-100 transition-colors ${selectedSlotIds.includes(slot.id) ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedSlotIds.includes(slot.id)}
                            onChange={() => toggleSlotSelection(slot.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-700">{new Date(slot.start_time).toLocaleString()}</td>
                        <td className="px-3 py-2 text-gray-700">{new Date(slot.end_time).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            slot.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {slot.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <select
                              value={slot.status}
                              onChange={async (e) => {
                                try {
                                  await timeSlotApi.update(slot.id, { status: e.target.value as TimeSlotStatus })
                                  await reloadSlots()
                                  toast.success('Slot status updated')
                                } catch (error: any) {
                                  toast.error(error?.response?.data?.message || 'Failed to update slot')
                                }
                              }}
                              className="px-2 py-1 rounded border border-gray-200 text-xs bg-white"
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="RESERVED">RESERVED</option>
                            </select>
                            <button
                              onClick={async () => {
                                if (!window.confirm('Delete this time slot?')) return
                                try {
                                  await timeSlotApi.delete(slot.id)
                                  await reloadSlots()
                                  toast.success('Slot deleted')
                                } catch (error: any) {
                                  toast.error(error?.response?.data?.message || 'Failed to delete slot')
                                }
                              }}
                              className="px-2.5 py-1.5 rounded border border-red-200 text-red-600 text-xs hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Cluster availability */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-1">Cluster Availability</h4>
              <p className="text-xs text-gray-500 mb-3">Check available slots across the entire cluster for a specific date.</p>
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Select date</label>
                  <input
                    type="date"
                    value={clusterAvailDate}
                    onChange={(e) => setClusterAvailDate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!pod || !clusterAvailDate) {
                      toast.error('Please select a date first')
                      return
                    }
                    try {
                      const response = await timeSlotApi.getClusterAvailableByDate(pod.cluster_id, clusterAvailDate)
                      setClusterAvailableSlots(response.data)
                    } catch (error: any) {
                      toast.error(error?.response?.data?.message || 'Failed to load cluster availability')
                    }
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50"
                >
                  Check
                </button>
              </div>
              {clusterAvailableSlots.length > 0 && (
                <p className="mt-3 text-sm text-green-700 font-medium">
                  Cluster has <span className="font-bold">{clusterAvailableSlots.length}</span> available slot(s) on {clusterAvailDate}
                </p>
              )}
              {clusterAvailDate && clusterAvailableSlots.length === 0 && (
                <p className="mt-3 text-sm text-gray-400">No available slots on this date.</p>
              )}
            </div>

          </div>
        )}

        {activeTab === 'poditems' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Pod Items</h3>
              <p className="text-xs text-gray-500 mt-1">Assign inventory items to this pod and track expected vs current quantity.</p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800">Create New Item</h4>
                <span className="text-[11px] text-gray-500">Creates a record in table `items`</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item Name</label>
                  <input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Tissue Box"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item Type</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as ItemType)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
                  >
                    <option value="CONSUMABLE">CONSUMABLE</option>
                    <option value="REUSABLE">REUSABLE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItemUnitCost}
                    onChange={(e) => setNewItemUnitCost(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleCreateItem}
                  disabled={isCreatingItem}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isCreatingItem ? 'Creating...' : 'Create Item'}
                </button>
                <p className="text-[11px] text-gray-500">After creating, Item ID is auto-filled below.</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/60">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item</label>
                  <select
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    disabled={isLoadingItems || availableItems.length === 0}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">{isLoadingItems ? 'Loading items...' : 'Select an item'}</option>
                    {availableItems.map((item) => {
                      const unitCost = getItemUnitCost(item)
                      const name = item.name || item.item_name || item.code || item.sku || item.id
                      return (
                        <option key={item.id} value={item.id}>
                          {unitCost == null ? `${name} | Unit cost: N/A` : `${name} | Unit cost: ${unitCost}`}
                        </option>
                      )
                    })}
                  </select>
                  {isLoadingItems ? (
                    <p className="mt-1 text-[11px] text-gray-500">Loading items...</p>
                  ) : itemsLoadError ? (
                    <p className="mt-1 text-[11px] text-amber-600">{itemsLoadError}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-gray-500">{availableItems.length} item(s) loaded. Select by name and unit cost.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expected Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={expectedQty}
                    onChange={(e) => setExpectedQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Current Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={currentQty}
                    onChange={(e) => setCurrentQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={async () => {
                      if (!pod || !itemId.trim()) {
                        toast.error('Item ID is required')
                        return
                      }

                      const normalizedItemId = itemId.trim()
                      if (availableItems.length > 0 && !availableItems.some((item) => item.id === normalizedItemId)) {
                        toast.warning('Item ID is not in loaded list. Please ensure it exists in items table.')
                      }

                      const expected = parseNonNegativeInt(expectedQty)
                      const current = parseNonNegativeInt(currentQty)
                      if (expected === null || current === null) {
                        toast.error('Quantities must be whole numbers >= 0')
                        return
                      }

                      try {
                        await podItemApi.create({
                          pod_id: pod.id,
                          item_id: normalizedItemId,
                          expected_quantity: expected,
                          current_quantity: current
                        })
                        setItemId('')
                        setExpectedQty('1')
                        setCurrentQty('1')
                        await loadModuleData()
                        toast.success('Pod item created')
                      } catch (error: any) {
                        const status = error?.response?.status
                        const message = error?.response?.data?.message
                        if (status === 404) {
                          toast.error(message || 'Pod or item not found. Please create/select a valid item first.')
                        } else if (status === 409) {
                          toast.error(message || 'This item is already linked to the current pod.')
                        } else if (status === 400) {
                          toast.error(message || 'Invalid pod item payload')
                        } else {
                          toast.error(message || 'Failed to create pod item')
                        }
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {podItems.length === 0 ? (
                <p className="text-sm text-gray-400">No pod items yet</p>
              ) : podItems.map((item) => {
                const isMissing = item.current_quantity < item.expected_quantity

                return (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Item ID: {item.item_id}</p>
                      <p className="text-xs text-gray-500">Expected: {item.expected_quantity} | Current: {item.current_quantity}</p>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${isMissing ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isMissing ? 'Missing items' : 'Sufficient'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const expectedRaw = window.prompt('Expected quantity (>= 0)', String(item.expected_quantity))
                          const currentRaw = window.prompt('Current quantity (>= 0)', String(item.current_quantity))
                          if (expectedRaw == null || currentRaw == null) return

                          const expected = parseNonNegativeInt(expectedRaw)
                          const current = parseNonNegativeInt(currentRaw)
                          if (expected === null || current === null) {
                            toast.error('Quantities must be whole numbers >= 0')
                            return
                          }

                          try {
                            await podItemApi.update(item.id, { expected_quantity: expected, current_quantity: current })
                            await loadModuleData()
                            toast.success('Pod item updated')
                          } catch (error: any) {
                            toast.error(error?.response?.data?.message || 'Failed to update pod item')
                          }
                        }}
                        className="px-2.5 py-1.5 rounded border border-gray-200 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Delete this pod item?')) return
                          try {
                            await podItemApi.delete(item.id)
                            await loadModuleData()
                            toast.success('Pod item deleted')
                          } catch (error: any) {
                            toast.error(error?.response?.data?.message || 'Failed to delete pod item')
                          }
                        }}
                        className="px-2.5 py-1.5 rounded border border-red-200 text-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
