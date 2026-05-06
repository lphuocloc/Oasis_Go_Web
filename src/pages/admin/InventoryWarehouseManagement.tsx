import React, { useEffect, useMemo, useState } from 'react'
import { Link2, Package, Plus, RefreshCw } from 'lucide-react'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { locationApi, type LocationItem } from '../../api/lib/locationApi'
import { itemApi, type CreateItemPayload, type InventoryItem, type ItemType, type UpdateItemPayload } from '../../api/lib/itemApi'
import {
  warehouseApi,
  type WarehouseItem
} from '../../api/lib/warehouseApi'
import {
  locationWarehouseApi,
  type EffectiveLocationWarehouseItem,
  type EffectiveLocationWarehouseTraceItem,
  type LocationWarehouseItem
} from '../../api/lib/locationWarehouseApi'
import {
  inventoryStockApi,
  type InventoryStockItem
} from '../../api/lib/inventoryStockApi'
import {
  inventoryCheckoutLogApi,
  INVENTORY_ACTION_TYPES,
  type InventoryActionType,
  type InventoryCheckoutLogItem
} from '../../api/lib/inventoryCheckoutLogApi'
import { initUserSocket } from '../../lib/socket'

type InventoryTab = 'warehouseSetup' | 'items' | 'stocks' | 'checkoutLogs'

const TABS: Array<{ key: InventoryTab; label: string }> = [
  { key: 'warehouseSetup', label: 'Liên kết Kho & Vị trí' },
  { key: 'items', label: 'Vật tư' },
  { key: 'stocks', label: 'Tồn kho' },
  { key: 'checkoutLogs', label: 'Nhật ký Xuất kho' }
  { key: 'warehouseSetup', label: 'Kho hàng & Liên kết địa điểm' },
  { key: 'items', label: 'Vật tư' },
  { key: 'stocks', label: 'Tồn kho' },
  { key: 'checkoutLogs', label: 'Nhật ký xuất/nhập kho' }
]

const getItemName = (item: InventoryItem) => item.name || item.item_name || item.code || item.sku || item.id

const getItemType = (item: InventoryItem): ItemType | null => {
  const candidate = item.item_type || item.type
  if (candidate === 'CONSUMABLE' || candidate === 'REUSABLE') return candidate
  return null
}

const getItemTypeLabel = (type: ItemType | null): string => {
  if (type === 'CONSUMABLE') return 'Tiêu hao'
  if (type === 'REUSABLE') return 'Tái sử dụng'
  return '—'
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  CHECKOUT: 'Xuất kho',
  RETURN: 'Hoàn trả',
  WASTE: 'Hao hụt',
  INITIAL: 'Khởi tạo',
  ADJUSTMENT: 'Điều chỉnh',
  ITEM_DELETED: 'Đã xóa',
  CONSUMED: 'Đã sử dụng',
}

const getActionTypeLabel = (type: string): string => ACTION_TYPE_LABELS[type] ?? type

const translateReason = (reason?: string | null): string => {
  if (!reason) return '—'
  // Auto consumed for cleaning task {id}
  const cleaningMatch = reason.match(/^Auto consumed for cleaning task (.+)$/)
  if (cleaningMatch) return `Tự động sử dụng cho nhiệm vụ vệ sinh ${cleaningMatch[1]}`
  // Auto consumed for maintenance task {id}
  const maintenanceMatch = reason.match(/^Auto consumed for maintenance task (.+)$/)
  if (maintenanceMatch) return `Tự động sử dụng cho nhiệm vụ bảo trì ${maintenanceMatch[1]}`
  const REASON_MAP: Record<string, string> = {
    'Stock quantity adjusted': 'Điều chỉnh số lượng tồn kho',
    'Initial stock': 'Tồn kho khởi tạo',
    'Item deleted': 'Vật tư đã bị xóa',
    'Checked out': 'Xuất kho',
    'Returned': 'Hoàn trả',
    'Wasted': 'Hao hụt',
  }
  return REASON_MAP[reason] ?? reason
}

const shortId = (value?: string | null) => {
  if (!value) return '—'
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value
}

const SectionCard: React.FC<{
  title: string
  description?: string
  children: React.ReactNode
}> = ({ title, description, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
    <div className="p-4">{children}</div>
  </div>
)

const StatCard: React.FC<{
  label: string
  value: string | number
}> = ({ label, value }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
  </div>
)

export const InventoryWarehouseManagement: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<InventoryTab>('warehouseSetup')
  const [isLoading, setIsLoading] = useState(false)

  const [locations, setLocations] = useState<LocationItem[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [locationWarehouses, setLocationWarehouses] = useState<LocationWarehouseItem[]>([])
  const [stocks, setStocks] = useState<InventoryStockItem[]>([])
  const [checkoutLogs, setCheckoutLogs] = useState<InventoryCheckoutLogItem[]>([])

  const [warehouseNameFilter, setWarehouseNameFilter] = useState('')
  const [newWarehouseName, setNewWarehouseName] = useState('')
  const [newWarehouseAddress, setNewWarehouseAddress] = useState('')
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null)
  const [editWarehouseName, setEditWarehouseName] = useState('')
  const [editWarehouseAddress, setEditWarehouseAddress] = useState('')
  const [isSavingWarehouseEdit, setIsSavingWarehouseEdit] = useState(false)

  const [mappingLocationFilter, setMappingLocationFilter] = useState('all')
  const [mappingWarehouseFilter, setMappingWarehouseFilter] = useState('all')
  const [newMappingLocationId, setNewMappingLocationId] = useState('')
  const [newMappingWarehouseId, setNewMappingWarehouseId] = useState('')
  const [editingMapping, setEditingMapping] = useState<LocationWarehouseItem | null>(null)
  const [editMappingLocationId, setEditMappingLocationId] = useState('')
  const [editMappingWarehouseId, setEditMappingWarehouseId] = useState('')
  const [isSavingMappingEdit, setIsSavingMappingEdit] = useState(false)
  const [effectiveLocationId, setEffectiveLocationId] = useState('')
  const [effectiveMappings, setEffectiveMappings] = useState<EffectiveLocationWarehouseItem[]>([])
  const [effectiveTrace, setEffectiveTrace] = useState<EffectiveLocationWarehouseTraceItem[]>([])
  const [isEffectiveDebugMode, setIsEffectiveDebugMode] = useState(false)

  const [stockWarehouseFilter, setStockWarehouseFilter] = useState('all')
  const [stockItemFilter, setStockItemFilter] = useState('all')
  const [newStockWarehouseId, setNewStockWarehouseId] = useState('')
  const [newStockItemId, setNewStockItemId] = useState('')
  const [newStockQuantity, setNewStockQuantity] = useState('0')
  const [itemSearch, setItemSearch] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState<ItemType>('CONSUMABLE')
  const [newItemUnitCost, setNewItemUnitCost] = useState('0')
  const [isCreatingItem, setIsCreatingItem] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemType, setEditItemType] = useState<ItemType>('CONSUMABLE')
  const [editItemUnitCost, setEditItemUnitCost] = useState('0')
  const [isSavingItemEdit, setIsSavingItemEdit] = useState(false)
  const [editingStock, setEditingStock] = useState<InventoryStockItem | null>(null)
  const [editStockQuantity, setEditStockQuantity] = useState('0')
  const [isSavingStockEdit, setIsSavingStockEdit] = useState(false)

  const [logStockFilter, setLogStockFilter] = useState('all')
  const [logStaffFilter, setLogStaffFilter] = useState('')
  const [logActionFilter, setLogActionFilter] = useState<'all' | InventoryActionType>('all')
  const [logFromFilter, setLogFromFilter] = useState('')
  const [logToFilter, setLogToFilter] = useState('')

  const [editingCheckoutLog, setEditingCheckoutLog] = useState<InventoryCheckoutLogItem | null>(null)
  const [editLogStaffId, setEditLogStaffId] = useState('')
  const [editLogQuantity, setEditLogQuantity] = useState('1')
  const [editLogActionType, setEditLogActionType] = useState<InventoryActionType>('CHECKOUT')
  const [editLogReason, setEditLogReason] = useState('')
  const [isSavingCheckoutLogEdit, setIsSavingCheckoutLogEdit] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const locationMap = useMemo(() => new Map(locations.map((x) => [x.id, x])), [locations])
  const warehouseMap = useMemo(() => new Map(warehouses.map((x) => [x.id, x])), [warehouses])
  const itemMap = useMemo(() => new Map(items.map((x) => [x.id, x])), [items])
  const stockMap = useMemo(() => new Map(stocks.map((x) => [x.id, x])), [stocks])

  const formatStockLabel = (stockId: string) => {
    const stock = stockMap.get(stockId)
    if (!stock) return `Tồn kho không xác định (${shortId(stockId)})`

    const warehouseName = warehouseMap.get(stock.warehouse_id)?.name || shortId(stock.warehouse_id)
    const itemName = getItemName(itemMap.get(stock.item_id) || { id: stock.item_id })
    return `${warehouseName} - ${itemName} (SL: ${stock.quantity_available})`
  }

  const formatStaffLabel = (staffId?: string | null) => {
    if (!staffId) return '—'

    if (user && user.id === staffId) {
      return user.name || user.email || staffId
    }

    const id = shortId(staffId)
    return id === staffId ? `Nhân viên ${staffId}` : `Nhân viên ${id} (${staffId})`
  }

  const formatTaskLabel = (taskId?: string | null, taskType?: 'Cleaning' | 'Maintenance') => {
    if (!taskId) return '—'
    const id = shortId(taskId)
    const prefix = taskType === 'Cleaning' ? 'Nhiệm vụ Vệ sinh' : taskType === 'Maintenance' ? 'Nhiệm vụ Bảo trì' : 'Nhiệm vụ'
    const prefix = taskType === 'Cleaning' ? 'Vệ sinh' : taskType === 'Maintenance' ? 'Bảo trì' : 'Nhiệm vụ'
    return id === taskId ? `${prefix} ${taskId}` : `${prefix} ${id} (${taskId})`
  }

  const knownStaffIds = useMemo(
    () => Array.from(new Set(checkoutLogs.map((log) => log.staff_id).filter(Boolean))).sort(),
    [checkoutLogs]
  )

  const getItemUnitCost = (item: InventoryItem): number | null => {
    const candidate = item.unit_cost ?? item.unitCost
    if (candidate == null) return null
    const num = Number(candidate)
    return Number.isFinite(num) ? num : null
  }

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase()
    if (!q) return items

    return items.filter((item) => {
      const name = getItemName(item)
      return [name, item.code, item.sku, item.id].filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [items, itemSearch])

  const setDefaultCreateValues = (nextWarehouses?: WarehouseItem[], nextLocations?: LocationItem[], nextItems?: InventoryItem[]) => {
    const ws = nextWarehouses ?? warehouses
    const ls = nextLocations ?? locations
    const it = nextItems ?? items

    if (!newMappingLocationId && ls[0]?.id) setNewMappingLocationId(ls[0].id)
    if (!newMappingWarehouseId && ws[0]?.id) setNewMappingWarehouseId(ws[0].id)
    if (!effectiveLocationId && ls[0]?.id) setEffectiveLocationId(ls[0].id)
    if (!newStockWarehouseId && ws[0]?.id) setNewStockWarehouseId(ws[0].id)
    if (!newStockItemId && it[0]?.id) setNewStockItemId(it[0].id)
  }

  const loadDependencies = async () => {
    try {
      const [locationRes, itemRes, warehouseRes, stockRes] = await Promise.all([
        locationApi.getAll(),
        itemApi.getAll(),
        warehouseApi.getAll(),
        inventoryStockApi.getAll()
      ])

      setLocations(locationRes.data)
      setItems(itemRes.data || [])
      setWarehouses(warehouseRes.data)
      setStocks(stockRes.data)
      setDefaultCreateValues(warehouseRes.data, locationRes.data, itemRes.data || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải dữ liệu phụ thuộc')
    }
  }

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true)
      const response = await warehouseApi.getAll({ name: warehouseNameFilter.trim() || undefined })
      setWarehouses(response.data)
      setDefaultCreateValues(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách kho hàng')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLocationWarehouses = async () => {
    try {
      setIsLoading(true)
      const response = await locationWarehouseApi.getAll({
        location_id: mappingLocationFilter === 'all' ? undefined : mappingLocationFilter,
        warehouse_id: mappingWarehouseFilter === 'all' ? undefined : mappingWarehouseFilter
      })
      setLocationWarehouses(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách liên kết Kho - Vị trí')
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách liên kết địa điểm-kho hàng')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStocks = async () => {
    try {
      setIsLoading(true)
      const response = await inventoryStockApi.getAll({
        warehouse_id: stockWarehouseFilter === 'all' ? undefined : stockWarehouseFilter,
        item_id: stockItemFilter === 'all' ? undefined : stockItemFilter
      })
      setStocks(response.data)
      setDefaultCreateValues(undefined, undefined, undefined)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách tồn kho')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      setIsLoading(true)
      const response = await itemApi.getAll()
      setItems(response.data || [])
      setDefaultCreateValues(undefined, undefined, response.data || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách vật tư')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCheckoutLogs = async () => {
    try {
      setIsLoading(true)
      const response = await inventoryCheckoutLogApi.getAll({
        inventory_stock_id: logStockFilter === 'all' ? undefined : logStockFilter,
        staff_id: logStaffFilter.trim() || undefined,
        action_type: logActionFilter === 'all' ? undefined : logActionFilter,
        from: logFromFilter ? new Date(logFromFilter).toISOString() : undefined,
        to: logToFilter ? new Date(logToFilter).toISOString() : undefined
      })
      setCheckoutLogs(response.data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải nhật ký xuất/nhập kho')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshActiveTab = async () => {
    if (activeTab === 'warehouseSetup') return Promise.all([fetchWarehouses(), fetchLocationWarehouses()])
    if (activeTab === 'items') return fetchItems()
    if (activeTab === 'stocks') return fetchStocks()
    return fetchCheckoutLogs()
  }

  useEffect(() => {
    loadDependencies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  useEffect(() => {
    refreshActiveTab()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, refreshTrigger])

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
    if (activeTab === 'warehouseSetup') fetchWarehouses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseNameFilter])

  useEffect(() => {
    if (activeTab === 'warehouseSetup') fetchLocationWarehouses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappingLocationFilter, mappingWarehouseFilter])

  useEffect(() => {
    if (activeTab === 'items') fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'stocks') fetchStocks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockWarehouseFilter, stockItemFilter])

  useEffect(() => {
    if (activeTab === 'checkoutLogs') fetchCheckoutLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logStockFilter, logStaffFilter, logActionFilter, logFromFilter, logToFilter])

  const handleCreateWarehouse = async () => {
    if (!newWarehouseName.trim()) {
      toast.error('Tên kho hàng là bắt buộc')
      return
    }
    try {
      await warehouseApi.create({
        name: newWarehouseName.trim(),
        address: newWarehouseAddress.trim() || undefined
      })
      setNewWarehouseName('')
      setNewWarehouseAddress('')
      toast.success('Tạo kho hàng thành công')
      await Promise.all([fetchWarehouses(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tạo kho hàng')
    }
  }

  const openEditWarehouseModal = (warehouse: WarehouseItem) => {
    setEditingWarehouse(warehouse)
    setEditWarehouseName(warehouse.name)
    setEditWarehouseAddress(warehouse.address || '')
  }

  const closeEditWarehouseModal = () => {
    if (isSavingWarehouseEdit) return
    setEditingWarehouse(null)
    setEditWarehouseName('')
    setEditWarehouseAddress('')
  }

  const handleUpdateWarehouse = async () => {
    if (!editingWarehouse) return
    if (!editWarehouseName.trim()) {
      toast.error('Tên kho hàng là bắt buộc')
      return
    }

    try {
      setIsSavingWarehouseEdit(true)
      await warehouseApi.update(editingWarehouse.id, {
        name: editWarehouseName.trim(),
        address: editWarehouseAddress.trim() || undefined
      })
      toast.success('Cập nhật kho hàng thành công')
      closeEditWarehouseModal()
      await Promise.all([fetchWarehouses(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật kho hàng')
    } finally {
      setIsSavingWarehouseEdit(false)
    }
  }

  const handleDeleteWarehouse = async (warehouse: WarehouseItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa kho "${warehouse.name}"?`)) return
    if (!window.confirm(`Xóa kho hàng "${warehouse.name}"?`)) return
    try {
      await warehouseApi.delete(warehouse.id)
      toast.success('Xóa kho hàng thành công')
      await Promise.all([fetchWarehouses(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể xóa kho hàng')
    }
  }

  const handleCreateMapping = async () => {
    if (!newMappingLocationId || !newMappingWarehouseId) {
      toast.error('Cần chọn địa điểm và kho hàng')
      return
    }
    try {
      await locationWarehouseApi.create({
        location_id: newMappingLocationId,
        warehouse_id: newMappingWarehouseId
      })
      toast.success('Tạo liên kết địa điểm-kho hàng thành công')
      await fetchLocationWarehouses()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tạo liên kết')
    }
  }

  const openEditMappingModal = (mapping: LocationWarehouseItem) => {
    setEditingMapping(mapping)
    setEditMappingLocationId(mapping.location_id)
    setEditMappingWarehouseId(mapping.warehouse_id)
  }

  const closeEditMappingModal = () => {
    if (isSavingMappingEdit) return
    setEditingMapping(null)
    setEditMappingLocationId('')
    setEditMappingWarehouseId('')
  }

  const handleEditMapping = async () => {
    if (!editingMapping) return
    if (!editMappingLocationId || !editMappingWarehouseId) {
      toast.error('Cần chọn địa điểm và kho hàng')
      return
    }

    try {
      setIsSavingMappingEdit(true)
      await locationWarehouseApi.update(editingMapping.id, {
        location_id: editMappingLocationId.trim(),
        warehouse_id: editMappingWarehouseId.trim()
      })
      toast.success('Cập nhật liên kết thành công')
      closeEditMappingModal()
      await fetchLocationWarehouses()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật liên kết')
    } finally {
      setIsSavingMappingEdit(false)
    }
  }

  const handleDeleteMapping = async (mapping: LocationWarehouseItem) => {
    if (!window.confirm('Xóa liên kết địa điểm-kho hàng này?')) return
    try {
      await locationWarehouseApi.delete(mapping.id)
      toast.success('Xóa liên kết thành công')
      await fetchLocationWarehouses()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể xóa liên kết')
    }
  }

  const handleResolveEffectiveMappings = async (debug: boolean) => {
    if (!effectiveLocationId) {
      toast.error('Vui lòng chọn địa điểm để tra cứu liên kết hiệu lực')
      return
    }
    try {
      setIsLoading(true)
      if (debug) {
        const response = await locationWarehouseApi.getEffectiveDebug(effectiveLocationId)
        setEffectiveMappings(response.data)
        setEffectiveTrace(response.trace || [])
      } else {
        const response = await locationWarehouseApi.getEffective(effectiveLocationId)
        setEffectiveMappings(response.data)
        setEffectiveTrace([])
      }
      setIsEffectiveDebugMode(debug)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tra cứu liên kết hiệu lực')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateStock = async () => {
    if (!newStockWarehouseId || !newStockItemId) {
      toast.error('Cần chọn kho hàng và vật tư')
      return
    }
    const quantity = Number(newStockQuantity)
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error('Số lượng không được âm')
      return
    }

    try {
      await inventoryStockApi.create({
        warehouse_id: newStockWarehouseId,
        item_id: newStockItemId,
        quantity_available: Math.floor(quantity)
      })
      toast.success('Tạo tồn kho thành công')
      setNewStockQuantity('0')
      await Promise.all([fetchStocks(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tạo tồn kho')
    }
  }

  const handleCreateItem = async () => {
    const trimmedName = newItemName.trim()
    if (!trimmedName) {
      toast.error('Tên vật tư là bắt buộc')
      return
    }

    const unitCost = Number(newItemUnitCost)
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      toast.error('Đơn giá phải là số >= 0')
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

      await loadDependencies()
      if (createdItem?.id) {
        setNewStockItemId(createdItem.id)
      }

      setNewItemName('')
      setNewItemType('CONSUMABLE')
      setNewItemUnitCost('0')
      toast.success('Tạo vật tư thành công')
    } catch (error: any) {
      const status = error?.response?.status
      const message = error?.response?.data?.message
      if (status === 404) {
        toast.error('API vật tư không tồn tại trên server (POST /items hoặc POST /item).')
      } else if (status === 409) {
        toast.error(message || 'Vật tư đã tồn tại')
      } else if (status === 400) {
        toast.error(message || 'Dữ liệu vật tư không hợp lệ')
      } else {
        toast.error(message || 'Không thể tạo vật tư')
      }
    } finally {
      setIsCreatingItem(false)
    }
  }

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItem(item)
    setEditItemName(getItemName(item))
    setEditItemType(getItemType(item) || 'CONSUMABLE')
    const unitCost = getItemUnitCost(item)
    setEditItemUnitCost(unitCost == null ? '0' : String(unitCost))
  }

  const closeEditItemModal = () => {
    if (isSavingItemEdit) return
    setEditingItem(null)
    setEditItemName('')
    setEditItemType('CONSUMABLE')
    setEditItemUnitCost('0')
  }

  const handleEditItem = async () => {
    if (!editingItem) return

    const trimmedName = editItemName.trim()
    if (!trimmedName) {
      toast.error('Tên vật tư là bắt buộc')
      return
    }

    const unitCost = Number(editItemUnitCost)
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      toast.error('Đơn giá phải là số >= 0')
      return
    }

    const payload: UpdateItemPayload = {
      name: trimmedName,
      item_type: editItemType,
      unit_cost: unitCost
    }

    try {
      setIsSavingItemEdit(true)
      await itemApi.update(editingItem.id, payload)
      toast.success('Cập nhật vật tư thành công')
      closeEditItemModal()
      await Promise.all([fetchItems(), loadDependencies()])
    } catch (error: any) {
      const message = error?.response?.data?.message
      toast.error(message || 'Không thể cập nhật vật tư')
    } finally {
      setIsSavingItemEdit(false)
    }
  }

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vật tư "${getItemName(item)}"?`)) return
    if (!window.confirm(`Xóa vật tư "${getItemName(item)}"?`)) return

    try {
      await itemApi.delete(item.id)
      toast.success('Xóa vật tư thành công')
      await Promise.all([fetchItems(), loadDependencies()])
    } catch (error: any) {
      const message = error?.response?.data?.message
      toast.error(message || 'Không thể xóa vật tư')
    }
  }

  const openEditStockModal = (stock: InventoryStockItem) => {
    setEditingStock(stock)
    setEditStockQuantity(String(stock.quantity_available))
  }

  const closeEditStockModal = () => {
    if (isSavingStockEdit) return
    setEditingStock(null)
    setEditStockQuantity('0')
  }

  const handleEditStock = async () => {
    if (!editingStock) return
    const quantity = Number(editStockQuantity)
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error('Số lượng không được âm')
      return
    }

    try {
      setIsSavingStockEdit(true)
      await inventoryStockApi.update(editingStock.id, { quantity_available: Math.floor(quantity) })
      toast.success('Cập nhật tồn kho thành công')
      closeEditStockModal()
      await Promise.all([fetchStocks(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật tồn kho')
    } finally {
      setIsSavingStockEdit(false)
    }
  }

  const handleDeleteStock = async (stock: InventoryStockItem) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tồn kho này?')) return
    if (!window.confirm('Xóa tồn kho này?')) return
    try {
      await inventoryStockApi.delete(stock.id)
      toast.success('Xóa tồn kho thành công')
      await Promise.all([fetchStocks(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể xóa tồn kho')
    }
  }

  const closeEditCheckoutLogModal = () => {
    if (isSavingCheckoutLogEdit) return
    setEditingCheckoutLog(null)
    setEditLogStaffId('')
    setEditLogQuantity('1')
    setEditLogActionType('CHECKOUT')
    setEditLogReason('')
  }

  const handleEditCheckoutLog = async () => {
    if (!editingCheckoutLog) return

    const quantity = Number(editLogQuantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Số lượng phải là số dương')
      return
    }

    if (!editLogStaffId.trim()) {
      toast.error('Cần chọn nhân viên')
      return
    }

    try {
      setIsSavingCheckoutLogEdit(true)
      await inventoryCheckoutLogApi.update(editingCheckoutLog.id, {
        staff_id: editLogStaffId.trim(),
        quantity: Math.floor(quantity),
        action_type: editLogActionType,
        reason: editLogReason.trim() || null
      })
      toast.success('Cập nhật nhật ký xuất/nhập thành công')
      closeEditCheckoutLogModal()
      await Promise.all([fetchCheckoutLogs(), fetchStocks(), loadDependencies()])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật nhật ký xuất/nhập')
    } finally {
      setIsSavingCheckoutLogEdit(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Kho hàng & Vật tư</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý kho, liên kết vị trí, tồn kho và nhật ký xuất kho.</p>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Kho hàng &amp; Vật tư</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý kho hàng, liên kết địa điểm, tồn kho và nhật ký xuất/nhập kho.</p>
          </div>
          <button
            onClick={refreshActiveTab}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'warehouseSetup' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard label="Tổng kho hàng" value={warehouses.length} />
              <StatCard label="Tổng liên kết" value={locationWarehouses.length} />
              <StatCard label="Tên lọc" value={warehouseNameFilter.trim() || 'Tất cả'} />
              <StatCard label="Địa điểm đã tải" value={locations.length} />
            </div>

            <SectionCard title="Tạo kho hàng" description="Tạo kho hàng mới trước khi liên kết với địa điểm hoặc tồn kho.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tên kho hàng</label>
                  <input
                    value={newWarehouseName}
                    onChange={(e) => setNewWarehouseName(e.target.value)}
                    placeholder="Ví dụ: Kho Tân Bình"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Địa chỉ</label>
                  <input
                    value={newWarehouseAddress}
                    onChange={(e) => setNewWarehouseAddress(e.target.value)}
                    placeholder="Địa chỉ kho hàng"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              <button onClick={handleCreateWarehouse} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Tạo kho hàng
              </button>
            </SectionCard>

            <SectionCard title="Danh sách kho hàng" description="Xem, chỉnh sửa hoặc xóa kho hàng hiện có.">
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Lọc theo tên</label>
                <input
                  value={warehouseNameFilter}
                  onChange={(e) => setWarehouseNameFilter(e.target.value)}
                  placeholder="Tìm kiếm tên kho hàng..."
                  className="w-full md:max-w-md px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Kho hàng</th>
                      <th className="px-4 py-3 text-left">Địa chỉ</th>
                      <th className="px-4 py-3 text-left">Ngày tạo</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouses.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Không có kho hàng</td></tr>
                    ) : warehouses.map((warehouse) => (
                      <tr key={warehouse.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{warehouse.name}</div>
                          <div className="text-xs text-gray-500">{warehouse.id}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{warehouse.address || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{warehouse.created_at ? new Date(warehouse.created_at).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <button onClick={() => openEditWarehouseModal(warehouse)} className="px-2.5 py-1.5 border border-gray-200 rounded">Sửa</button>
                            <button onClick={() => handleDeleteWarehouse(warehouse)} className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded">Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
            <SectionCard title="Thiết lập Địa điểm-Kho hàng" description="Tạo và duy trì liên kết sau khi tạo kho hàng.">
              <p className="text-xs text-gray-500">Sử dụng mục này ngay sau khi tạo kho hàng để gán từng địa điểm với kho hàng phù hợp.</p>
            </SectionCard>

            <SectionCard title="Tạo liên kết" description="Liên kết một địa điểm với một kho hàng. Các cặp trùng lặp sẽ bị từ chối.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Địa điểm</label>
                  <select value={newMappingLocationId} onChange={(e) => setNewMappingLocationId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="">Chọn địa điểm</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kho hàng</label>
                  <select value={newMappingWarehouseId} onChange={(e) => setNewMappingWarehouseId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="">Chọn kho hàng</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={handleCreateMapping} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold">
                <Link2 className="w-4 h-4" />
                Tạo liên kết
              </button>
            </SectionCard>

            <SectionCard title="Tra cứu kho hàng hiệu lực" description="Tra cứu các liên kết kho hàng được kế thừa từ cấu trúc địa điểm (trực tiếp + thừa kế).">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Địa điểm yêu cầu</label>
                  <select
                    value={effectiveLocationId}
                    onChange={(e) => setEffectiveLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs"
                  >
                    <option value="">Chọn địa điểm</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex items-end gap-2">
                  <button
                    onClick={() => handleResolveEffectiveMappings(false)}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold"
                  >
                    Tra cứu
                  </button>
                  <button
                    onClick={() => handleResolveEffectiveMappings(true)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs"
                  >
                    Tra cứu + Debug Trace
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Loại nguồn</th>
                      <th className="px-3 py-2 text-left">Địa điểm yêu cầu</th>
                      <th className="px-3 py-2 text-left">Địa điểm nguồn</th>
                      <th className="px-3 py-2 text-left">Kho hàng</th>
                      <th className="px-3 py-2 text-left">Độ sâu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveMappings.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Chưa có liên kết hiệu lực nào</td></tr>
                    ) : effectiveMappings.map((mapping) => (
                      <tr key={`${mapping.id}-${mapping.source_location_id}`} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-xs">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${mapping.source_type === 'direct' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {mapping.source_type === 'direct' ? 'Trực tiếp' : 'Kế thừa'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{locationMap.get(mapping.requested_location_id)?.name || mapping.requested_location_id}</td>
                        <td className="px-3 py-2 text-gray-700">{locationMap.get(mapping.source_location_id)?.name || mapping.source_location_id}</td>
                        <td className="px-3 py-2 text-gray-700">{warehouseMap.get(mapping.warehouse_id)?.name || mapping.warehouse_id}</td>
                        <td className="px-3 py-2 text-gray-700">{mapping.resolution_depth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isEffectiveDebugMode && (
                <div className="mt-4 overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left">Địa điểm trace</th>
                        <th className="px-3 py-2 text-left">Độ sâu</th>
                        <th className="px-3 py-2 text-left">Số liên kết</th>
                        <th className="px-3 py-2 text-left">Khớp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveTrace.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Không có dữ liệu trace</td></tr>
                      ) : effectiveTrace.map((trace) => (
                        <tr key={`${trace.location_id}-${trace.depth}`} className="border-t border-gray-100 text-xs">
                          <td className="px-3 py-2 text-gray-700">{locationMap.get(trace.location_id)?.name || trace.location_id}</td>
                          <td className="px-3 py-2 text-gray-700">{trace.depth}</td>
                          <td className="px-3 py-2 text-gray-700">{trace.mapping_count}</td>
                          <td className="px-3 py-2 text-gray-700">{trace.matched ? 'Có' : 'Không'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Danh sách liên kết" description="Xem các liên kết địa điểm-kho hàng hiện tại và cập nhật hoặc xóa.">
              <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lọc theo địa điểm</label>
                  <select value={mappingLocationFilter} onChange={(e) => setMappingLocationFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="all">Tất cả địa điểm</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lọc theo kho hàng</label>
                  <select value={mappingWarehouseFilter} onChange={(e) => setMappingWarehouseFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="all">Tất cả kho hàng</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Địa điểm</th>
                      <th className="px-4 py-3 text-left">Kho hàng</th>
                      <th className="px-4 py-3 text-left">Ngày tạo</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationWarehouses.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Không có liên kết</td></tr>
                    ) : locationWarehouses.map((mapping) => (
                      <tr key={mapping.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <div className="text-gray-800">{locationMap.get(mapping.location_id)?.name || mapping.location_id}</div>
                          <div className="text-xs text-gray-500">{mapping.location_id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800">{warehouseMap.get(mapping.warehouse_id)?.name || mapping.warehouse_id}</div>
                          <div className="text-xs text-gray-500">{mapping.warehouse_id}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{mapping.created_at ? new Date(mapping.created_at).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <button onClick={() => openEditMappingModal(mapping)} className="px-2.5 py-1.5 border border-gray-200 rounded">Sửa</button>
                            <button onClick={() => handleDeleteMapping(mapping)} className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded">Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'stocks' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Số dòng tồn kho" value={stocks.length} />
              <StatCard label="Kho có hàng" value={new Set(stocks.map((stock) => stock.warehouse_id)).size} />
              <StatCard label="Tổng số lượng có sẵn" value={stocks.reduce((sum, stock) => sum + stock.quantity_available, 0)} />
            </div>

            <SectionCard title="Tạo tồn kho" description="Tạo dòng tồn kho đầu tiên cho cặp kho hàng-vật tư. Các cặp trùng lặp sẽ bị từ chối.">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kho hàng</label>
                  <select value={newStockWarehouseId} onChange={(e) => setNewStockWarehouseId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="">Chọn kho hàng</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vật tư</label>
                  <select value={newStockItemId} onChange={(e) => setNewStockItemId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="">Chọn vật tư</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{getItemName(item)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Số lượng có sẵn</label>
                  <input value={newStockQuantity} onChange={(e) => setNewStockQuantity(e.target.value)} type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
              </div>
              <button onClick={handleCreateStock} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold">
                <Package className="w-4 h-4" />
                Tạo tồn kho
              </button>
            </SectionCard>

            <SectionCard title="Danh sách tồn kho" description="Xem số lượng tồn kho theo kho hàng và vật tư.">
              <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lọc theo kho hàng</label>
                  <select value={stockWarehouseFilter} onChange={(e) => setStockWarehouseFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="all">Tất cả kho hàng</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lọc theo vật tư</label>
                  <select value={stockItemFilter} onChange={(e) => setStockItemFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="all">Tất cả vật tư</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{getItemName(item)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Kho hàng</th>
                      <th className="px-4 py-3 text-left">Vật tư</th>
                      <th className="px-4 py-3 text-left">Số lượng</th>
                      <th className="px-4 py-3 text-left">Cập nhật</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Không có tồn kho</td></tr>
                    ) : stocks.map((stock) => (
                      <tr key={stock.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <div className="text-gray-800">{warehouseMap.get(stock.warehouse_id)?.name || stock.warehouse_id}</div>
                          <div className="text-xs text-gray-500">{stock.warehouse_id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800">{getItemName(itemMap.get(stock.item_id) || { id: stock.item_id })}</div>
                          <div className="text-xs text-gray-500">{stock.item_id}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{stock.quantity_available}</td>
                        <td className="px-4 py-3 text-gray-700">{stock.updated_at ? new Date(stock.updated_at).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <button onClick={() => openEditStockModal(stock)} className="px-2.5 py-1.5 border border-gray-200 rounded">Sửa</button>
                            <button onClick={() => handleDeleteStock(stock)} className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded">Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'items' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Tổng vật tư" value={items.length} />
              <StatCard label="Vật tư đã lọc" value={filteredItems.length} />
              <StatCard label="Sẵn sàng nhập kho" value={items.length} />
            </div>

            <SectionCard title="Tạo vật tư" description="Tạo hồ sơ vật tư được sử dụng bởi tồn kho và nhật ký xuất/nhập.">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tên vật tư</label>
                  <input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Ví dụ: Hộp khăn giấy"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loại vật tư</label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as ItemType)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs"
                  >
                    <option value="CONSUMABLE">Tiêu hao</option>
                    <option value="REUSABLE">Tái sử dụng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Đơn giá</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItemUnitCost}
                    onChange={(e) => setNewItemUnitCost(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateItem}
                disabled={isCreatingItem}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                {isCreatingItem ? 'Đang tạo...' : 'Tạo vật tư'}
              </button>
            </SectionCard>

            <SectionCard title="Danh sách vật tư" description="Xem và tìm kiếm các vật tư đã tạo dùng cho quản lý tồn kho.">
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Tìm kiếm vật tư</label>
                <input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Tìm theo tên, mã, SKU, ID..."
                  className="w-full md:max-w-md px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Vật tư</th>
                      <th className="px-4 py-3 text-left">Loại vật tư</th>
                      <th className="px-4 py-3 text-left">Đơn giá</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Không tìm thấy vật tư</td></tr>
                    ) : filteredItems.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{getItemName(item)}</div>
                          <div className="text-xs text-gray-500">{item.id}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{getItemTypeLabel(getItemType(item))}</td>
                        <td className="px-4 py-3 text-gray-700">{getItemUnitCost(item) == null ? 'N/A' : getItemUnitCost(item)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <button onClick={() => openEditItemModal(item)} className="px-2.5 py-1.5 border border-gray-200 rounded">Sửa</button>
                            <button onClick={() => handleDeleteItem(item)} className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded">Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        <Modal
          isOpen={Boolean(editingItem)}
          onClose={closeEditItemModal}
          title="Chỉnh sửa vật tư"
          size="sm"
          footer={(
            <>
              <button
                onClick={closeEditItemModal}
                disabled={isSavingItemEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleEditItem}
                disabled={isSavingItemEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-xs font-bold"
              >
                {isSavingItemEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tên vật tư</label>
              <input
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                placeholder="Tên vật tư"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Loại vật tư</label>
              <select
                value={editItemType}
                onChange={(e) => setEditItemType(e.target.value as ItemType)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs"
              >
                <option value="CONSUMABLE">Tiêu hao</option>
                <option value="REUSABLE">Tái sử dụng</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Đơn giá</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editItemUnitCost}
                onChange={(e) => setEditItemUnitCost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
              />
            </div>
          </div>
        </Modal>

        {activeTab === 'checkoutLogs' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard label="Tổng nhật ký" value={checkoutLogs.length} />
              <StatCard label="Xuất kho" value={checkoutLogs.filter((log) => log.action_type === 'CHECKOUT').length} />
              <StatCard label="Nhập lại" value={checkoutLogs.filter((log) => log.action_type === 'RETURN').length} />
              <StatCard label="Hao hụt" value={checkoutLogs.filter((log) => log.action_type === 'WASTE').length} />
            </div>

            <SectionCard title="Danh sách nhật ký xuất/nhập kho" description="Lịch sử xuất/nhập kho (chức năng sửa/xóa tạm thời ẩn).">
              <div className="mb-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <select value={logStockFilter} onChange={(e) => setLogStockFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white">
                  <option value="all">Tất cả tồn kho</option>
                  {stocks.map((stock) => (
                    <option key={stock.id} value={stock.id}>{formatStockLabel(stock.id)}</option>
                  ))}
                </select>
                <input
                  value={logStaffFilter}
                  onChange={(e) => setLogStaffFilter(e.target.value)}
                  placeholder="Lọc theo nhân viên"
                  list="staff-filter-options"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-xs"
                />
                <datalist id="staff-filter-options">
                  {knownStaffIds.map((staffId) => (
                    <option key={staffId} value={staffId}>{formatStaffLabel(staffId)}</option>
                  ))}
                </datalist>
                <select value={logActionFilter} onChange={(e) => setLogActionFilter(e.target.value as 'all' | InventoryActionType)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white">
                  <option value="all">Tất cả loại hành động</option>
                  {INVENTORY_ACTION_TYPES.map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  value={logFromFilter ? dayjs(logFromFilter) : null}
                  onChange={(value) => setLogFromFilter(value ? value.format('YYYY-MM-DDTHH:mm') : '')}
                  className="w-full"
                />
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  value={logToFilter ? dayjs(logToFilter) : null}
                  onChange={(value) => setLogToFilter(value ? value.format('YYYY-MM-DDTHH:mm') : '')}
                  className="w-full"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Hành động</th>
                      <th className="px-4 py-3 text-left">Tồn kho</th>
                      <th className="px-4 py-3 text-left">Nhân viên</th>
                      <th className="px-4 py-3 text-left">Nhiệm vụ vệ sinh</th>
                      <th className="px-4 py-3 text-left">Số lượng</th>
                      <th className="px-4 py-3 text-left">Lý do</th>
                      <th className="px-4 py-3 text-left">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkoutLogs.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Không có nhật ký xuất/nhập</td></tr>
                    ) : checkoutLogs.map((log) => (
                      <tr key={log.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${log.action_type === 'RETURN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {getActionTypeLabel(log.action_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatStockLabel(log.inventory_stock_id)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatStaffLabel(log.staff_id)}</td>
                        <td className="px-4 py-3 text-gray-700">{formatTaskLabel(log.cleaning_task_id, 'Cleaning')}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{log.quantity}</td>
                        <td className="px-4 py-3 text-gray-700">{translateReason(log.reason)}</td>
                        <td className="px-4 py-3 text-gray-700">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        <Modal
          isOpen={Boolean(editingWarehouse)}
          onClose={closeEditWarehouseModal}
          title="Chỉnh sửa kho hàng"
          size="md"
          footer={(
            <>
              <button
                onClick={closeEditWarehouseModal}
                disabled={isSavingWarehouseEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateWarehouse}
                disabled={isSavingWarehouseEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-xs font-bold"
              >
                {isSavingWarehouseEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tên kho hàng</label>
              <input
                value={editWarehouseName}
                onChange={(e) => setEditWarehouseName(e.target.value)}
                placeholder="Tên kho hàng"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Địa chỉ</label>
              <input
                value={editWarehouseAddress}
                onChange={(e) => setEditWarehouseAddress(e.target.value)}
                placeholder="Địa chỉ kho hàng"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={Boolean(editingMapping)}
          onClose={closeEditMappingModal}
          title="Chỉnh sửa liên kết Địa điểm-Kho hàng"
          size="md"
          footer={(
            <>
              <button
                onClick={closeEditMappingModal}
                disabled={isSavingMappingEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleEditMapping}
                disabled={isSavingMappingEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-xs font-bold"
              >
                {isSavingMappingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Địa điểm</label>
              <select
                value={editMappingLocationId}
                onChange={(e) => setEditMappingLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs"
              >
                <option value="">Chọn địa điểm</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kho hàng</label>
              <select
                value={editMappingWarehouseId}
                onChange={(e) => setEditMappingWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs"
              >
                <option value="">Chọn kho hàng</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={Boolean(editingCheckoutLog)}
          onClose={closeEditCheckoutLogModal}
          title="Chỉnh sửa nhật ký xuất/nhập"
          size="md"
          footer={(
            <>
              <button
                onClick={closeEditCheckoutLogModal}
                disabled={isSavingCheckoutLogEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleEditCheckoutLog}
                disabled={isSavingCheckoutLogEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-xs font-bold"
              >
                {isSavingCheckoutLogEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nhân viên</label>
              <select
                value={editLogStaffId}
                onChange={(e) => setEditLogStaffId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs"
              >
                <option value="">Chọn nhân viên</option>
                {knownStaffIds.map((staffId) => (
                  <option key={staffId} value={staffId}>{formatStaffLabel(staffId)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Số lượng</label>
                <input
                  type="number"
                  min="1"
                  value={editLogQuantity}
                  onChange={(e) => setEditLogQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loại hành động</label>
                <select
                  value={editLogActionType}
                  onChange={(e) => setEditLogActionType(e.target.value as InventoryActionType)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs"
                >
                  {INVENTORY_ACTION_TYPES.map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lý do</label>
              <input
                value={editLogReason}
                onChange={(e) => setEditLogReason(e.target.value)}
                placeholder="Lý do (tùy chọn)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={Boolean(editingStock)}
          onClose={closeEditStockModal}
          title="Chỉnh sửa tồn kho"
          size="md"
          footer={(
            <>
              <button
                onClick={closeEditStockModal}
                disabled={isSavingStockEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleEditStock}
                disabled={isSavingStockEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-xs font-bold"
              >
                {isSavingStockEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kho hàng</label>
                <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                  {editingStock ? (warehouseMap.get(editingStock.warehouse_id)?.name || editingStock.warehouse_id) : '—'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vật tư</label>
                <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                  {editingStock ? getItemName(itemMap.get(editingStock.item_id) || { id: editingStock.item_id }) : '—'}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Số lượng có sẵn</label>
              <input
                type="number"
                min="0"
                value={editStockQuantity}
                onChange={(e) => setEditStockQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
